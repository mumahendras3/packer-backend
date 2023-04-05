const mongoose = require('../config/connection');
const { Schema } = mongoose;

const taskSchema = new Schema({
  repo: {
    type: Schema.Types.ObjectId,
    ref: 'Repo',
    required: [true, 'Repo is required']
  },
  releaseAsset: {
    type: String,
    required: [true, 'Release asset is required']
  },
  additionalFiles: [{ type: Schema.Types.ObjectId, ref: 'File' }],
  runCommand: {
    type: String,
    required: [true, 'Run command is required']
  },
  containerImage: {
    type: String,
    required: [true, 'Container Image is required']
  },
  containerId: String,
  status: {
    type: String,
    default: 'Created',
    enum: {
      values: ['Created', 'Running', 'Failed', 'Succeeded'],
      message: 'Unknown status: {VALUE}'
    }
  }
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;