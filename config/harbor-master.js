const docker = require("harbor-master");

const client = docker.Client({
  socket: process.env.DOCKER_ENGINE_URL,
});

module.exports = client;
