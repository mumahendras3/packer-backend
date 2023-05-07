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
  },
  currentVersion: {
    type: String,
    required: [true, 'Current Version is required']
  },
  latestVersion: {
    type: String,
    required: [true, 'Latest Version is required']
  },
  latestReleaseAssets: [{ name: String, url: String }],
  ownerAvatar: String
}, {
  virtuals: {
    githubReleasesEndpoint: {
      get() {
        return `https://api.github.com/repos/${this.ownerName}/${this.name}/releases`;
      }
    }
  }
});

const Repo = mongoose.model('Repo', repoSchema);

module.exports = Repo;