const mongoose = require("../config/connection");
const { Schema } = mongoose;

const taskSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User is required"],
  },
  repo: {
    type: Schema.Types.ObjectId,
    ref: "Repo",
    required: [true, "Repo is required"],
  },
  releaseAsset: {
    type: String,
    required: [true, "Release asset is required"],
  },
  additionalFiles: [{ type: Schema.Types.ObjectId, ref: "File" }],
  runCommand: {
    type: String,
    required: [true, "Run command is required"],
  },
  containerImage: {
    type: String,
    required: [true, "Container Image is required"],
  },
  containerId: String,
  runAt: {
    type: {
      second: Number,
      minute: Number,
      hour: Number,
      date: Number,
      month: Number,
      year: Number,
    },
    default: null,
  },
  status: {
    type: String,
    default: "Created",
    enum: {
      values: ["Created", "Running", "Failed", "Succeeded", "Scheduled"],
      message: "Unknown status: {VALUE}",
    },
  },
});

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;
