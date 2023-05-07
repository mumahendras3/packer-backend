const { default: axios } = require("axios");
const client = require("../config/harbor-master");
const fs = require("fs/promises");
const tar = require("tar");
const Task = require("../models/task");
const download = require("../helpers/download");
const Repo = require("../models/repo");

class TaskController {
  static async listTasks(req, res, next) {
    try {
      const { id } = req.loggedInUser;
      const tasks = await Task.find({ user: id })
        .populate("repo additionalFiles user", "-__v")
        .select("-__v");
      res.status(200).json(tasks);
    } catch (err) {
      next(err);
    }
  }

  static async addTask(req, res, next) {
    try {
      const { id: userId } = req.loggedInUser;
      console.log(userId);
      const {
        repo,
        releaseAsset,
        additionalFiles,
        runCommand,
        containerImage,
      } = req.body;
      console.log({
        repo,
        releaseAsset,
        additionalFiles,
        runCommand,
        containerImage,
      });
      const task = new Task({
        user: userId,
        repo,
        releaseAsset,
        additionalFiles,
        runCommand,
        containerImage,
      });
      const opt = {
        filters: {
          reference: [task.containerImage],
        },
      };

      const split = task.containerImage.split(":");
      const options = {
        fromImage: split[0],
        tag: split[1],
      };
      console.log(split, "<<<splitnya");
      let image;
      try {
        image = await client.images().inspect(split[0]);
      } catch (error) {
        const result = await client.images().create(options);
        console.log(result);
        console.log(error, "<<error");
      }
      console.log(image, "<<<image");
      if (
        !image.RepoTags.find((el) => {
          el.includes(split[1]);
        })
      ) {
        const response = await client.images().create(options);
        console.log(response);
      }
      const model = {
        Image: task.containerImage,
        Cmd: ["sh", "-c", task.runCommand],
        WorkingDir: "/task",
      };
      const container = await client.containers().create(model);
      const repoObj = await Repo.findById(task.repo);
      const { url: releaseAssetUrl } = repoObj.latestReleaseAssets.find(
        (asset) => asset.name === task.releaseAsset
      );
      // Download the release asset
      await download(releaseAssetUrl);
      const filesToUpload = [task.releaseAsset];
      if (task.additionalFiles.length) {
        filesToUpload.push(...task.additionalFiles.map((file) => file.name));
      }
      await tar.c(
        {
          gzip: true,
          file: `files/for-${container.Id}.tgz`,
          cwd: "files",
        },
        filesToUpload
      );
      const file = await fs.readFile(`files/for-${container.Id}.tgz`);
      let url = process.env.DOCKER_ENGINE_URL;
      let socketPath = null;
      if (/.+\.sock$/.test(url)) {
        url = "http:/.";
        socketPath = process.env.DOCKER_ENGINE_URL;
      }
      const axiosOptions = {
        method: "PUT",
        // method: "GET",
        url: `${url}/containers/${
          container.Id
        }/archive?path=${encodeURIComponent("task")}`,
        // url: `${url}/containers/json`,
        headers: {
          "Content-Type": "application/x-tar",
        },
        socketPath,
        data: file,
      };
      console.log(axiosOptions);
      const rs = await axios(axiosOptions);
      // Cleanup the file since it's already sent
      await fs.unlink(`files/for-${container.Id}.tgz`);
      // // Start the container
      // response = await axios({
      //   method: "POST",
      //   url:
      //     process.env.DOCKER_ENGINE_URL + `/containers/${container.Id}/start`,
      // });
      // if (response.status === 204) {
      //   task.containerId = container.Id;
      //   task.status = "Running";
      //   await task.save();
      // }
      console.log(rs);
      task.containerId = container.Id;
      await task.save();
      res.status(201).json({
        message: "Task successfully added",
        id: task._id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async startTask(req, res, next) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id).populate("repo additionalFiles");
      if (!task) throw { name: "TaskNotFound" };
      await new Promise(async (resolve, reject) => {
        try {
          await client.containers().start(task.containerId);
        } catch (error) {
          if (error.response.statusCode === 204) {
            resolve();
          } else {
            reject(error);
          }
        }
      });
      const opt = {
        details: true,
        timestamps: true,
        stdout: true,
        tail: "all",
      };
      const log = await client.containers().logs(task.containerId, opt);
      const lines = log.split(/\r?\n/).slice(0, -1);
      const arr = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].replace(
          /[\x00\x01\x02\x03\x04\x05\x06\07\xFF]/g,
          ""
        );
        arr.push(line);
      }
      let cleaning = "";
      const remove = /,/g;
      for (let j = 0; j < arr.length; j++) {
        const sliced = arr[j].slice(1);
        const date = sliced.substring(0, 30);
        const content = sliced.substring(30);
        const newformatDate = new Date(date);
        const dates = new Intl.DateTimeFormat("en-GB", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "numeric",
          minute: "numeric",
          second: "2-digit",
        }).format(newformatDate);
        const newDate = dates.replace(remove, "");
        cleaning += newDate + content + "\n";
      }
      console.log(cleaning, "<<bersih");
      res.send(cleaning);
    } catch (err) {
      next(err);
    }
  }

  static async checkTask(req, res, next) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id)
        .populate("additionalFiles", "-__v")
        .select("-__v");
      if (!task) throw { name: "TaskNotFound" };
      if (!task.containerId) {
        return res.status(200).json(task);
      }
      const { data } = await axios({
        method: "GET",
        url:
          process.env.DOCKER_ENGINE_URL +
          `/containers/${task.containerId}/json`,
      });
      if (data.State.Status === "exited") {
        // The container has exited, update the task status accordingly
        if (data.State.ExitCode === 0) {
          // The task succeeded
          task.status = "Succeeded";
          // Update the local version of the repo associated with this task to the
          // latest one
          const repo = await Repo.findById(task.repo._id);
          repo.currentVersion = repo.latestVersion;
          await repo.save();
        } else {
          // The task failed
          task.status = "Failed";
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
      if (!task) throw { name: "TaskNotFound" };
      const response = await axios({
        method: "GET",
        url:
          process.env.DOCKER_ENGINE_URL +
          `/containers/${task.containerId}/logs?stdout=true&stderr=true`,
        headers: {
          Accept: "application/vnd.docker.multiplexed-stream",
        },
      });
      if (response.status !== 200) throw { response };
      res.set("Content-Type", "application/vnd.docker.multiplexed-stream");
      res.status(response.status).send(response.data);
    } catch (err) {
      next(err);
    }
  }

  static async deleteTask(req, res, next) {
    try {
      const { id } = req.params;
      const task = await Task.findByIdAndDelete(id).select("-__v");
      if (!task) throw { name: "TaskNotFound" };
      res.status(200).json({
        message: "Task successfully deleted",
        removedTask: task,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = TaskController;
