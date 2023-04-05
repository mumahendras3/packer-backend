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
  mimeType: {
    type: String,
    required: [true, 'MIME Type is required']
  },
  extract: {
    type: Boolean,
    default: false
  }
});

const File = mongoose.model('File', fileSchema);

module.exports = File;