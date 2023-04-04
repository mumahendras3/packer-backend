const User = require("../models/user");

class UserController {
  static async register(req, res, next) {
    try {
      console.log('Hello! I\'m running!');
      const { email, password, githubAccessToken } = req.body;
      // console.log({ email, password, githubAccessToken });
      const user = new User({ email, password, githubAccessToken });
      console.log(user);
      await user.save();
      res.status(201).json({
        message: 'Registration successful',
        email: user.email
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UserController;