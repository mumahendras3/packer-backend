const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.test') });
const { it, expect, describe, beforeAll, afterAll } = require('@jest/globals');
const request = require('supertest');
const mongoose = require('../config/connection');
const User = require('../models/user');
const Repo = require('../models/repo');
const app = require('../app');
const { signToken } = require('../helpers/jwt');
const { default: axios } = require('axios');

// Initial data
const user2 = {
  email: 'm2@m.com',
  name: 'm2',
  password: '1234'
}
const repo1 = {
  name: 'repo1',
  ownerName: 'ownerRepo1'
};

// For storing access token
let access_token;

// Mock the axios module
jest.mock('axios');

// The mock response for when hitting GitHub APIs
const mockResp = {
  data: {
    name: 'v1.0',
    avatar_url: 'https://picsum.photos/200',
    assets: [{
      name: 'asset1',
      browser_download_url: 'asset1-download-url'
    }]
  }
};

beforeAll(async () => {
  // Insert the temporary user
  const user = new User(user2);
  await user.save();
  // Create the access token
  const payload = { id: user._id };
  access_token = signToken(payload);
});

afterAll(async () => {
  // Cleanup the database after test
  await User.findOneAndDelete({ email: user2.email, name: user2.name });
  await Repo.findOneAndDelete({ name: repo1.name, ownerName: repo1.ownerName });
  await mongoose.connection.close();
});

describe('POST /repos', () => {
  it(`should respond with the message "Repo successfully added" and should return the ObjectId of the newly added repo`, async () => {
    // Mock the GitHub endpoint requests
    axios.mockResolvedValue(mockResp);

    const res = await request(app)
      .post('/repos')
      .set('access_token', access_token)
      .send(repo1);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'Repo successfully added');
    // Compare the returned id with the actual one in database
    const repo = await Repo.findOne({ name: repo1.name, ownerName: repo1.ownerName });
    expect(res.body).toHaveProperty('id', repo._id.toString());
  });
});

describe('GET /repos', () => {
  it(`should respond with the list of repos in the logged-in user's watchlist`, async () => {
    const res = await request(app)
      .get('/repos')
      .set('access_token', access_token);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('name', repo1.name);
    expect(res.body[0]).toHaveProperty('ownerName', repo1.ownerName);
    expect(res.body[0]).toHaveProperty('currentVersion', mockResp.data.name);
    expect(res.body[0]).toHaveProperty('latestVersion', mockResp.data.name);
    expect(res.body[0]).toHaveProperty('latestReleaseAssets');
    expect(Array.isArray(res.body[0].latestReleaseAssets)).toBe(true);
    expect(res.body[0].latestReleaseAssets[0].name).toBe(mockResp.data.assets[0].name);
    expect(res.body[0].latestReleaseAssets[0].url).toBe(mockResp.data.assets[0].browser_download_url);
  });
});