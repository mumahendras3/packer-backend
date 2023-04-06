const { default: axios } = require("axios");
const fs = require('fs/promises');
const tar = require('tar');
const Task = require("../models/task");
const download = require("../helpers/download");
const Repo = require("../models/repo");

class TaskController {
  static async listTasks(req, res, next) {
    try {
      const tasks = await Task.find({}).populate('repo additionalFiles', '-__v').select('-__v');
      res.status(200).json(tasks);
    } catch (err) {
      next(err);
    }
  }

  static async addTask(req, res, next) {
    try {
      const {
        repo,
        releaseAsset,
        additionalFiles,
        runCommand,
        containerImage
      } = req.body;
      const task = new Task({
        repo,
        releaseAsset,
        additionalFiles,
        runCommand,
        containerImage
      });
      await task.save();
      res.status(201).json({
        message: 'Task successfully added',
        id: task._id
      });
    } catch (err) {
      next(err);
    }
  }

  static async startTask(req, res, next) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id).populate('repo additionalFiles');
      if (!task)
        throw { name: 'TaskNotFound' };
      // Before we create the container, make sure the image exists locally
      let response = await axios({
        method: 'GET',
        url: process.env.DOCKER_ENGINE_URL + `/images/json?filters={"reference":["${task.containerImage}"]}`
      });
      if (response.status === 200 && response.data.length < 1) {
        // The container image doesn't exist locally, pulling them first
        response = await axios({
          method: 'POST',
          url: process.env.DOCKER_ENGINE_URL + `/images/create?fromImage=${encodeURIComponent(task.containerImage)}`,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (response.status !== 200)
          throw { response };
      }
      const { data: { Id: containerId } } = await axios({
        method: 'POST',
        url: process.env.DOCKER_ENGINE_URL + '/containers/create',
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          Image: task.containerImage,
          Cmd: ['sh', '-c', task.runCommand],
          WorkingDir: '/task'
        }
      });
      // Before we start the container, upload all the necessary files to the container
      const { url: releaseAssetUrl } = task.repo.latestReleaseAssets.find(asset => asset.name === task.releaseAsset);
      // Download the release asset
      await download(releaseAssetUrl);
      const filesToUpload = [task.releaseAsset];
      if (task.additionalFiles.length) {
        filesToUpload.push(...task.additionalFiles.map(file => file.name));
      }
      await tar.c({
        gzip: true,
        file: `files/for-${containerId}.tgz`,
        cwd: 'files'
      }, filesToUpload);
      const file = await fs.readFile(`files/for-${containerId}.tgz`);
      await axios({
        method: 'PUT',
        url: `${process.env.DOCKER_ENGINE_URL}/containers/${containerId}/archive?path=${encodeURIComponent('/task')}`,
        headers: {
          'Content-Type': 'application/x-tar'
        },
        data: file
      });
      // Cleanup the file since it's already sent
      await fs.unlink(`files/for-${containerId}.tgz`);
      // Start the container
      response = await axios({
        method: 'POST',
        url: process.env.DOCKER_ENGINE_URL + `/containers/${containerId}/start`,
      });
      if (response.status === 204) {
        task.containerId = containerId;
        task.status = 'Running';
        await task.save();
      }
      res.status(response.status).json(response.data);
    } catch (err) {
      next(err);
    }
  }

  static async checkTask(req, res, next) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id)
        .populate('additionalFiles', '-__v')
        .select('-__v');
      if (!task)
        throw { name: 'TaskNotFound' };
      if (!task.containerId) {
        return res.status(200).json(task);
      }
      const { data } = await axios({
        method: 'GET',
        url: process.env.DOCKER_ENGINE_URL + `/containers/${task.containerId}/json`
      });
      if (data.State.Status === 'exited') {
        // The container has exited, update the task status accordingly
        if (data.State.ExitCode === 0) {
          // The task succeeded
          task.status = 'Succeeded';
          // Update the local version of the repo associated with this task to the
          // latest one
          const repo = await Repo.findById(task.repo._id);
          repo.currentVersion = repo.latestVersion;
          await repo.save();
        } else {
          // The task failed
          task.status = 'Failed';
        }
        await task.save();
      }
      res.status(200).json(task);
    } catch (err) {
      next(err);
    }
  }

  static async getTaskLogs(req, res, next) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id);
      if (!task)
        throw { name: 'TaskNotFound' };
      const response = await axios({
        method: 'GET',
        url: process.env.DOCKER_ENGINE_URL + `/containers/${task.containerId}/logs?stdout=true&stderr=true`,
        headers: {
          Accept: 'application/vnd.docker.multiplexed-stream'
        }
      });
      if (response.status !== 200)
        throw { response };
      res.set('Content-Type', 'application/vnd.docker.multiplexed-stream');
      res.status(response.status).send(response.data);
    } catch (err) {
      next(err);
    }
  }

  static async deleteTask(req, res, next) {
    try {
      const { id } = req.params;
      const task = await Task.findByIdAndDelete(id).select('-__v');
      if (!task)
        throw { name: 'TaskNotFound' };
      res.status(200).json({
        message: 'Task successfully deleted',
        removedTask: task
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = TaskController;