const mongoose = require('../config/connection');
const { Schema } = mongoose;

const repoSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required']
  },
  ownerName: {
    type: String,
    required: [true, 'Owner name is required']
  }
});

const Repo = mongoose.model('Repo', repoSchema);

module.exports = Repo;