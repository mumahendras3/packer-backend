const path = require('path');
require('dotenv').config({
  path: path.resolve(process.cwd(), '__test__/.env.harbor-master-dotenv-remote-engine')
});
const { it, expect, describe } = require('@jest/globals');

describe('Test harbor-master config for remote Docker Engine', () => {
  it(`should have proper configuration for remote Docker Engine`, () => {
    const client = require('../config/harbor-master');
    expect(client.modem.opts.host).toBe(process.env.DOCKER_REMOTE_HOST);
    expect(client.modem.opts.port).toBe(process.env.DOCKER_REMOTE_PORT);
  });
});