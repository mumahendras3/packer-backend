const docker = require("harbor-master");

let client;

if (process.env.REMOTE_HOST && process.env.REMOTE_PORT) {
  client = docker.Client({
    host: process.env.REMOTE_HOST,
    port: process.env.REMOTE_PORT,
  });
} else {
  client = docker.Client({
    socket: process.env.UNIX_SOCKET,
  });
}

module.exports = client;
