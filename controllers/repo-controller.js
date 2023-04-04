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
      if (!name)
        throw { errors: { repo: { message: 'Repo name is required' } } };
      if (!ownerName)
        throw { errors: { repo: { message: 'Repo owner name is required' } } };
      // Avoid duplicates
      const existingRepo = await Repo.findOne({ name, ownerName });
      if (existingRepo)
        throw { errors: { repo: { message: 'Repo already exists' } } };
      // Create a new Repo document
      const repo = new Repo({ name, ownerName });
      // Get the latest version for this repo
      const axiosOptions = {
        method: 'GET',
        url: repo.githubReleasesEndpoint + '/latest',
        headers: {
          accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      };
      if (authorization)
        axiosOptions.headers.authorization = authorization;
      const { data } = await axios(axiosOptions);
      repo.latestVersion = repo.currentVersion = data.name;
      await repo.save();
      // Add this repo to the logged-in user's watch list
      const user = await User.findById(id);
      user.watchList.push(repo._id);
      await user.save();
      res.status(201).json({
        message: 'Repo successfully added',
        id: repo._id
      });
    } catch (err) {
      // When the repo doesn't have any releases
      if (err.response.data.message === 'Not Found') {
        return next({
          errors: {
            repo: {
              message: 'No releases found for this repo'
            }
          }
        });
      }
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
          url: repo.githubReleasesEndpoint + '/latest',
          headers: {
            accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
          }
        };
        if (authorization)
          axiosOptions.headers.authorization = authorization;
        const { data } = await axios(axiosOptions);
        if (repo.latestVersion !== data.name) {
          repo.latestVersion = data.name;
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