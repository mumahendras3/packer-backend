const { default: axios } = require("axios");
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
      const { authorization } = req.headers;
      const { name, ownerName } = req.body;
      // Avoid duplicates
      const existingRepo = await Repo.findOne({ name, ownerName });
      if (existingRepo)
        throw { errors: { repo: { message: 'Repo already exists' } } };
      // Create a new Repo document
      const repo = new Repo({ name, ownerName });
      // Get the latest version for this repo
      const axiosOptions = {
        method: 'GET',
        url: repo.githubReleasesEndpoint + '?per_page=1'
      };
      if (authorization)
        axiosOptions.headers = { authorization };
      const { data } = await axios(axiosOptions);
      if (data.length < 1)
        throw { errors: { repo: { message: 'No releases found for this repo' } } };
      repo.latestVersion = repo.currentVersion = data[0].name;
      await repo.save();
      // Add this repo to the logged-in user's watch list
      const user = await User.findById(id);
      user.watchList.push(repo._id);
      await user.save();
      res.status(201).json({
        message: 'Repo successfully added'
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateVersion(req, res, next) {
    try {
      const { id } = req.loggedInUser;
      const { authorization } = req.headers;
      // Get all the repos in this user's watch list
      const user = await User.findById(id)
        .populate('watchList')
        .select('watchList');
      // Check for update for all of these repos
      for (const repo of user.watchList) {
        const axiosOptions = {
          method: 'GET',
          url: repo.githubReleasesEndpoint + '?per_page=1'
        };
        if (authorization)
          axiosOptions.headers = { authorization };
        const { data } = await axios(axiosOptions);
        if (repo.latestVersion !== data[0].name) {
          repo.latestVersion = data[0].name;
          await repo.save();
        }
      }
      res.status(200).json({
        message: 'All repos successfully checked for update'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = RepoController;