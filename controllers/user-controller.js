const { comparePassword } = require("../helpers/bcrypt");
const { signToken } = require("../helpers/jwt");
const User = require("../models/user");

class UserController {
  static async register(req, res, next) {
    try {
      console.log('Hello! I\'m running!');
      const { email, password } = req.body;
      // console.log({ email, password, githubAccessToken });
      const user = new User({ email, password });
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

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email)
        throw { errors: { email: { message: 'Email is required' } } };
      if (!password)
        throw { errors: { password: { message: 'Password is required' } } };
      const user = await User.findOne({ email });
      if (!user || !comparePassword(password, user.password))
        throw { name: 'InvalidCredentials' };
      const payload = { id: user._id };
      const access_token = signToken(payload);
      res.status(200).json({ access_token });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UserController;