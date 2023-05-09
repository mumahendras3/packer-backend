const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.test') });
const { it, expect, describe, beforeAll, afterAll } = require('@jest/globals');
const request = require('supertest');
const app = require('../app');
const mongoose = require('../config/connection');
const User = require('../models/user');
const { signToken } = require('../helpers/jwt');
const fs = require('fs/promises');
const File = require('../models/file');

// Initial data
const user4 = {
  email: 'm4@m.com',
  name: 'm4',
  password: '1234'
};
const inputFileName = 'test-file-for-upload.txt';
const inputFilePath = `__test__/${inputFileName}`;
const uploadedFilePath = `files/${inputFileName}`;

// For storing access token
let access_token;

beforeAll(async () => {
  // Insert the temporary user
  const user = new User(user4);
  await user.save();
  // Create the access token
  const payload = { id: user._id };
  access_token = signToken(payload);
});

afterAll(async () => {
  // Cleanup the database after test
  await User.findOneAndDelete({ email: user4.email, name: user4.name });
  await File.findOneAndDelete({ name: inputFileName });
  await mongoose.connection.close();
  await fs.unlink(uploadedFilePath);
});

describe('POST /files', () => {
  it(`should respond with the error message "Invalid token"`, async () => {
    const res = await request(app)
      .post('/files')
      .attach('additionalFiles', inputFilePath);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message', 'Invalid token');
  });

  it(`should respond with the message "Files uploaded successfully" along with the ids and names of the uploaded files`, async () => {
    const res = await request(app)
      .post('/files')
      .set('access_token', access_token)
      .attach('additionalFiles', inputFilePath);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'Files uploaded successfully');
    expect(res.body).toHaveProperty('files');
    expect(res.body.files.map(file => file.name)).toStrictEqual([inputFileName]);
  });
});