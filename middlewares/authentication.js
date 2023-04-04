const { verifyToken } = require("../helpers/jwt");
const User = require("../models/user");

async function authenticate(req, res, next) {
  try {
    const { access_token } = req.headers;
    if (!access_token)
      throw { name: 'InvalidToken' };
    const payload = verifyToken(access_token);
    const user = await User.findById(payload.id);
    if (!user)
      throw { name: 'InvalidToken' };
    req.loggedInUser = payload;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticate;