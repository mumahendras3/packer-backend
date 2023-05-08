const docker = require("harbor-master");

let client;

if (process.env.DOCKER_REMOTE_HOST && process.env.DOCKER_REMOTE_PORT) {
  client = docker.Client({
    host: process.env.DOCKER_REMOTE_HOST,
    port: process.env.DOCKER_REMOTE_PORT,
  });
} else {
  client = docker.Client({
    socket: process.env.UNIX_SOCKET || '/var/run/docker.sock',
  });
}

module.exports = client;
