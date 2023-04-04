const mongoose = require('../config/connection');
const { Schema } = mongoose;

const fileSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required']
  },
  path: {
    type: String,
    required: [true, 'Path is required']
  },
  extract: {
    type: Boolean,
    required: [true, 'Extract is required']
  }
});

const File = mongoose.model('File', fileSchema);

module.exports = File;