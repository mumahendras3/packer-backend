const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.test') });
const { it, expect, describe, beforeAll, afterAll } = require('@jest/globals');
const request = require('supertest');
const mongoose = require('../config/connection');
const User = require('../models/user');
const app = require('../app');

const user1 = {
  email: 'm1@m.com',
  name: 'm1',
  password: '1234'
}

afterAll(async () => {
  // Cleanup the database after test
  await User.findOneAndDelete({ email: user1.email, name: user1.name });
  await mongoose.connection.close();
});

describe('POST /register', () => {
  it(`should respond with the newly registered user's email and name, along with success message`, async () => {
    const res = await request(app)
      .post('/register')
      .send(user1);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('email', user1.email);
    expect(res.body).toHaveProperty('name', user1.name);
    expect(res.body).toHaveProperty('message', 'Registration successful');
  });
});

describe('POST /login', () => {
  it(`should respond with an access token and the logged-in user's email and name`, async () => {
    const res = await request(app)
      .post('/login')
      .send(user1);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    expect(typeof res.body.access_token).toBe('string');
    expect(res.body).toHaveProperty('email', user1.email);
    expect(res.body).toHaveProperty('name', user1.name);
  });
});