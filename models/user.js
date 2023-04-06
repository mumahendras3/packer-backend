const mongoose = require('../config/connection');
const { Schema } = mongoose;
const { hashPassword } = require('../helpers/bcrypt');

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
  },
  watchList: [{ type: Schema.Types.ObjectId, ref: 'Repo' }]
});

userSchema.pre('save', function (next) {
  if (this.password) {
    this.password = hashPassword(this.password);
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;