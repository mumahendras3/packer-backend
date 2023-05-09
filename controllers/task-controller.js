const { default: axios } = require("axios");
const client = require("../config/harbor-master");
const fs = require("fs/promises");
const tar = require("tar");
const Task = require("../models/task");
const User = require("../models/user");
const download = require("../helpers/download");
const Repo = require("../models/repo");
const schedule = require("node-schedule");
const { nodeMailer } = require("../helpers/nodemailer");
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

  static async getTaskById(req, res, next) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id)
        .populate("repo additionalFiles user", "-__v")
        .select("-__v");
      if (!task) {
        throw { name: "TaskNotFound" };
      }
      res.status(200).json(task);
    } catch (err) {
      next(err);
    }
  }

  static async searchDockerHubImage(req, res, next) {
    try {
      const { filter } = req.body;
      console.log(filter);

      const data = await client.images().search({ term: filter });
      const dataFilter = data.filter((el) => {
        return el.name.includes(filter);
      });
      // console.log(dataFilter);
      res.send(dataFilter);
    } catch (err) {
      console.log(err);
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
        runAt,
      } = req.body;

      const task = new Task({
        user: userId,
        repo,
        releaseAsset,
        additionalFiles,
        runCommand,
        containerImage,
        runAt,
      });

      // Validate this newly created task first before continuing further
      await task.validate();

      const opt = {
        filters: {
          reference: [task.containerImage],
        },
      };

      const split = task.containerImage.split(":");
      if (!split[1]) {
        split[1] = "latest";
      }

      console.log(split[1]);
      console.log(split);
      const options = {
        fromImage: split[0],
        tag: split[1],
      };

      let image;
      try {
        image = await client.images().inspect(split[0]);
        // console.log(image);
      } catch (error) {
        const result = await client.images().create(options);
        image = await client.images().inspect(split[0]);
      }

      if (!image.RepoTags.find((el) => el.includes(split[1]))) {
        const response = await client.images().create(options);
        // console.log(response);
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
      let url;
      let socketPath = null;
      if (process.env.DOCKER_REMOTE_HOST && process.env.DOCKER_REMOTE_PORT) {
        url = `http://${process.env.DOCKER_REMOTE_HOST}:${process.env.DOCKER_REMOTE_PORT}`;
      } else {
        url = "http:/.";
        socketPath = process.env.DOCKER_UNIX_SOCKET;
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
      // console.log(axiosOptions);
      const rs = await axios(axiosOptions);
      // Cleanup the file since it's already sent
      await fs.unlink(`files/for-${container.Id}.tgz`);

      // console.log(rs);
      task.containerId = container.Id;
      console.log(task.runAt, "<<<run atnya");
      await task.save();
      if (task.runAt) {
        const { year, month, date, hour, minute, second } = task.runAt;
        console.log({ year, month: month - 1, date, hour, minute, second });
        const dates = new Date(year, month - 1, date, hour, minute, second);
        console.log(dates);
        schedule.scheduleJob(dates, async function () {
          // console.log("masuk");
          try {
            // console.log("masuk sini");
            console.log(task.containerId, "<<<<<");
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

            const user = await User.findById(task.user);
            const inspect = await client.containers().inspect(task.containerId);
            console.log(inspect, "<<data inspect");
            if (inspect.State.Status === "running") {
              task.status = "Running";
              await task.save();
            }
            if (inspect.State.Status === "exited") {
              if (inspect.State.ExitCode === 0) {
                task.status = "Succeeded";
                await task.save();
              } else {
                task.status = "Failed";
                await task.save();
              }
            }
            // // console.log(container);
            // console.log(user.email, "<<email user");
            nodeMailer(
              user.email,
              "Task started",
              `<h1>The task below is already started ${task.runCommand} ${task.repo} ${task.releaseAsset} ${task.additionalFiles} ${task.containerImage} </h1>`
            );
          } catch (err) {
            console.log(err, "masuk error<<<<");
          }
        });
      }
      res.status(201).json({
        message: "Task successfully added",
        id: task._id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async downloadOutput(req, res, next) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id);
      if (!task) throw { name: "TaskNotFound" };
      if (task.status === "Created") {
        throw {
          name: "TaskNotStarted",
        };
      }
      if (task.status === "Failed") {
        throw {
          name: "TaskFail",
        };
      }
      if (task.status === "Running") {
        throw {
          name: "TaskStillRunning",
        };
      }
      let url;
      let socketPath = null;
      if (process.env.DOCKER_REMOTE_HOST && process.env.DOCKER_REMOTE_PORT) {
        url = `http://${process.env.DOCKER_REMOTE_HOST}:${process.env.DOCKER_REMOTE_PORT}`;
      } else {
        url = "http:/.";
        socketPath = process.env.DOCKER_UNIX_SOCKET;
      }

      const axiosOptions = {
        // method: "PUT",
        method: "GET",
        url: `${url}/containers/${
          task.containerId
        }/archive?path=${encodeURIComponent("task/output")}`,
        // url: `${url}/containers/json`,
        headers: {
          "Content-Type": "application/x-tar",
        },
        socketPath,
      };
      // console.log(axiosOptions);
      const { data } = await axios(axiosOptions);
      res.set({
        "Content-Type": "application/x-tar",
        "Content-Disposition": `attachment; filename="${task._id}-build-output.tar"`,
      });
      console.log(data, "<Data download");
      res.send(data);
    } catch (err) {
      console.log(err);
      next(err);
    }
  }

  static async startTask(req, res, next) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id).populate("repo additionalFiles");
      if (!task) throw { name: "TaskNotFound" };
      // api harbor master return to error if success start container
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

      task.status = "Running";
      await task.save();

      res.status(204).json();
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

      const opt = {
        details: true,
        timestamps: true,
        stdout: true,
        tail: "all",
      };

      if (task.status === "Created") {
        throw {
          name: "TaskNotStarted",
        };
      }
      const inspect = await client.containers().inspect(task.containerId);

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
      res.status(200).json(cleaning);
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
