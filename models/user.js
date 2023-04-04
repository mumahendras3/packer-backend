const mongoose = require('../config/connection');
const { hashPassword } = require('../helpers/bcrypt');
const { Schema } = mongoose;

const userSchema = new Schema({
  email: {
    type: String,
    match: [/.+\@.+\..+/, 'Invalid email format'],
    required: [true, 'Email is required'],
    unique: true
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  }
});

userSchema.pre('save', function (next) {
  this.password = hashPassword(this.password);
  this.githubAccessToken = hashPassword(this.githubAccessToken);
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;