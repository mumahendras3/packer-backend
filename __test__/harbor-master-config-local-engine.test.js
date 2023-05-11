const path = require('path');
require('dotenv').config({
  path: path.resolve(process.cwd(), '__test__/.env.harbor-master-dotenv-local-engine')
});
const { it, expect, describe } = require('@jest/globals');

describe('Test harbor-master config for local Docker Engine', () => {
  it(`should have proper configuration for local Docker Engine`, () => {
    const client = require('../config/harbor-master');
    expect(client.modem.opts.socket).toBe(process.env.DOCKER_UNIX_SOCKET);
  });
});