const Repo = require("../models/repo");
const User = require("../models/user");

class RepoController {
  static async listRepos(req, res, next) {
    try {
      const { id } = req.loggedInUser;
      const user = await User.findById(id)
        .populate('watchList', 'name ownerName')
        .select('watchList');
      res.status(200).json(user.watchList);
    } catch (err) {
      next(err);
    }
  }

  static async addRepo(req, res, next) {
    try {
      const { id } = req.loggedInUser;
      const { name, ownerName } = req.body;
      // Avoid duplicates
      const existingRepo = await Repo.findOne({ name, ownerName });
      if (existingRepo)
        throw { errors: { repo: { message: 'Repo already exists' } } };
      const user = await User.findById(id);
      const repo = new Repo({ name, ownerName });
      await repo.save();
      user.watchList.push(repo._id);
      await user.save();
      res.status(201).json({
        message: 'Repo successfully added'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = RepoController;