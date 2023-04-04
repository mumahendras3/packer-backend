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
}

module.exports = TaskController;