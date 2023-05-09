const { describe, expect, afterAll } = require('@jest/globals');
const download = require('../helpers/download');
const fs = require('fs/promises');

// We'll use google's home page html for testing
const url = 'https://www.google.com';
const fileName = 'www.google.com';
const filePath = `files/${fileName}`;

afterAll(async () => {
  await fs.unlink(filePath);
});

describe('Function Test: helpers/download', () => {
  it(`should download the file from the given URL`, async () => {
    try {
      await download(url);
      const fileStat = await fs.stat(filePath);
      expect(fileStat.size).toBeGreaterThan(0);
    } catch (err) {
      console.log(err);
      throw err;
    }
  });
});
