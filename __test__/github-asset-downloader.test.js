const { describe, expect, afterAll } = require('@jest/globals');
const download = require('../helpers/download');
const fs = require('fs/promises');
const { default: axios } = require('axios');

jest.mock('axios');

// We'll use a fake link since we will just simulate downloading
const url = 'http://some-file.com';
const fileName = 'some-file.com';
const filePath = `files/${fileName}`;

afterAll(async () => {
  await fs.unlink(filePath);
});

describe('Function Test: helpers/download', () => {
  it(`should download the file from the given URL`, async () => {
    // Mocking all calls to axios
    axios.mockImplementationOnce(() => {
      // Creating a stream to simulate downloading a file
      const Readable = require('stream').Readable;
      const s = new Readable();
      s.push('some random text contents');
      s.push(null) // basically EOF
      return { data: s };
    });

    await download(url);
    const fileStat = await fs.stat(filePath);
    expect(fileStat.size).toBeGreaterThan(0);
  });
});
