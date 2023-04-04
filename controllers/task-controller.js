const { default: axios } = require("axios");
const Task = require("../models/task");

class TaskController {
  static async listTasks(req, res, next) {
    try {
      const tasks = await Task.find({}).populate('repo', '-__v').select('-__v');
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
      const task = await Task.findById(id);
      const { data: { Id: containerId } } = await axios({
        method: 'POST',
        url: process.env.DOCKER_ENGINE_URL + '/containers/create',
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          Image: task.containerImage,
          Cmd: ['/bin/sh', '-c', task.runCommand]
        }
      });
      const response = await axios({
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
}

module.exports = TaskController;