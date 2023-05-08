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
const client = require('../config/harbor-master');
const Task = require('../models/task');
const download = require('../helpers/download');
const tar = require("tar");
const fs = require("fs/promises");
const schedule = require("node-schedule");

// Initial data
const user3 = {
  email: 'm3@m.com',
  name: 'm3',
  password: '1234'
}
const repo2 = {
  name: 'repo2',
  ownerName: 'ownerRepo2'
};

// For storing access token
let access_token;
// For storing the newly added task's id for further use in this test
let taskId;

// Mock the axios module
jest.mock('axios');
// Mock the harbor-master client instance
jest.mock('../config/harbor-master');
// Mock the download function helper
jest.mock('../helpers/download');
// Mock the tar module
jest.mock('tar');
// Mock the fs module
jest.mock("fs/promises");
// Mock the node-schedule module (since most of the scheduled operation are
// side effects that depend on 3rd-parties)
jest.mock("node-schedule");

// The mock responses for when hitting GitHub APIs
// When getting the latest version
const mockRespGetVersion = {
  data: {
    name: 'v1.0',
    assets: [{
      name: 'asset1',
      browser_download_url: 'asset1-download-url'
    }]
  }
};
// When getting the repo owner's avatar url
const mockRespGetAvatarUrl = {
  data: {
    avatar_url: 'https://picsum.photos/200'
  }
};
// When putting an archive file inside a container using axios (no response needed)
const mockRespPutArchive = {};
// When trying to download the build output from a container
const mockRespGetBuildOutput = {
  data: {} // Pretend that this is some kind of binary data
};
// When checking for a failing container's status through axios
const mockRespGetContainerStatusFailed = {
  data: {
    State: {
      Status: 'exited',
      ExitCode: 1
    }
  }
};
// When checking for a succeeding container's status through axios
const mockRespGetContainerStatusSucceeded = {
  data: {
    State: {
      Status: 'exited',
      ExitCode: 0
    }
  }
};
// Register these mock responses (these order of invocation corresponds
// with the order of axios request that will be executed at test time)
axios.mockResolvedValueOnce(mockRespGetVersion);
axios.mockResolvedValueOnce(mockRespGetAvatarUrl);
axios.mockResolvedValueOnce(mockRespPutArchive);
axios.mockResolvedValueOnce(mockRespGetBuildOutput);
axios.mockResolvedValueOnce(mockRespGetContainerStatusFailed);
axios.mockResolvedValueOnce(mockRespGetContainerStatusSucceeded);

// Testing data
const task1 = {
  repo: '', // will be updated to the right value in `beforeAll()`
  releaseAsset: mockRespGetVersion.data.assets[0].name,
  runCommand: 'runCommand1',
  containerImage: 'containerImage1:tag1',
  additionalFiles: [], // will be updated to the right value in `beforeAll()`,
  runAt: {
    second: 0,
    minute: 0,
    hour: 0,
    date: 1,
    month: 2,
    year: 2023
  }
};

// The mock responses for when hitting Docker Engine APIs through harbor master
// All success route
// Image can be found locally
const harborMasterMockRespSuccessImageCheck = {
  RepoTags: [task1.containerImage.split(':')[1]]
};
// Container created successfully
const harborMasterMockRespSuccessCreateContainer = {
  Id: 'some-random-id'
};
// Container started successfully
const harborMasterMockRespSuccessStartContainer = {
  response: {
    statusCode: 204
  }
};
const harborMasterMockRespSearchImagesOnDockerHub = [{
  "star_count": 1,
  "is_official": true,
  "name": "image1",
  "is_automated": false,
  "description": "description1"
}];
// Register these mock responses (these order of invocation corresponds
// with the order of function invocation at test time, including inside `app`)
client.images.mockReturnValueOnce({
  async inspect() {
    return harborMasterMockRespSuccessImageCheck;
  }
});
client.containers.mockReturnValueOnce({
  async create() {
    return harborMasterMockRespSuccessCreateContainer;
  }
});
client.containers.mockReturnValueOnce({
  async start() {
    // Using throw here as a workaround for a harbor master bug, where a successful starting
    // of a container will actually result in a throwed success response as returned by the
    // Docker Engine
    throw harborMasterMockRespSuccessStartContainer;
  }
});
client.images.mockReturnValueOnce({
  async search() {
    return harborMasterMockRespSearchImagesOnDockerHub;
  }
});

beforeAll(async () => {
  // Insert the temporary user
  const user = new User(user3);
  await user.save();
  // Create the access token
  const payload = { id: user._id };
  access_token = signToken(payload);
  // Insert the temporary repo
  const res = await request(app)
    .post('/repos')
    .set('access_token', access_token)
    .send(repo2);
  task1.repo = res.body.id;
});

afterAll(async () => {
  // Cleanup the database after test
  await User.findOneAndDelete({ email: user3.email, name: user3.name });
  await Repo.findOneAndDelete({ name: repo2.name, ownerName: repo2.ownerName });
  await Task.findOneAndDelete({
    releaseAsset: task1.releaseAsset,
    runCommand: task1.runCommand,
    containerImage: task1.containerImage,
    status: 'Created',
    containerId: harborMasterMockRespSuccessCreateContainer.Id
  });
  await mongoose.connection.close();
});

describe(`POST /tasks`, () => {
  it(`should respond with the error message "Invalid token"`, async () => {
    const res = await request(app)
      .post('/tasks')
      .send(task1);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message', 'Invalid token');
  });

  it(`should respond with the message "Task successfully added" and the newly added task's id`, async () => {
    const res = await request(app)
      .post('/tasks')
      .set('access_token', access_token)
      .send(task1);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'Task successfully added');
    // Compare the returned task id with the actual one in the database
    const task = await Task.findOne({
      releaseAsset: task1.releaseAsset,
      runCommand: task1.runCommand,
      containerImage: task1.containerImage,
      status: 'Created',
      containerId: harborMasterMockRespSuccessCreateContainer.Id
    });
    expect(res.body).toHaveProperty('id', task._id.toString());
    // Save this task's id for further use
    taskId = res.body.id;
  });

  it(`should respond with the error message "Repo is required"`, async () => {
    const res = await request(app)
      .post('/tasks')
      .set('access_token', access_token)
      .send({ ...task1, repo: null });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Repo is required');
  });

  it(`should respond with the error message "Release asset is required"`, async () => {
    const res = await request(app)
      .post('/tasks')
      .set('access_token', access_token)
      .send({ ...task1, releaseAsset: null });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Release asset is required');
  });

  it(`should respond with the error message "Run command is required"`, async () => {
    const res = await request(app)
      .post('/tasks')
      .set('access_token', access_token)
      .send({ ...task1, runCommand: null });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Run command is required');
  });

  it(`should respond with the error message "Container Image is required"`, async () => {
    const res = await request(app)
      .post('/tasks')
      .set('access_token', access_token)
      .send({ ...task1, containerImage: null });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Container Image is required');
  });
});

describe('POST /tasks/:id', () => {
  it(`should respond with the error message "Invalid token"`, async () => {
    const res = await request(app)
      .post(`/tasks/${taskId}`);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message', 'Invalid token');
  });

  it(`should respond with the error message "Task not found"`, async () => {
    const res = await request(app)
      .post('/tasks/645906542b43a050936c3bde') // this is a valid, randomly generated ObjectId
      .set('access_token', access_token);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message', 'Task not found');
  });

  it(`should respond with a status code of 204 and an empty response body`, async () => {
    const res = await request(app)
      .post(`/tasks/${taskId}`)
      .set('access_token', access_token);
    expect(res.status).toBe(204);
    expect(res.body).toStrictEqual({});
  });
});

describe('GET /tasks', () => {
  it(`should respond with the error message "Invalid token"`, async () => {
    const res = await request(app)
      .get('/tasks');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message', 'Invalid token');
  });

  it(`should respond with all the tasks that the authenticated user has added`, async () => {
    const res = await request(app)
      .get('/tasks')
      .set('access_token', access_token);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('_id', taskId);
  });
});

describe('GET /tasks/:id', () => {
  it(`should respond with the error message "Invalid token"`, async () => {
    const res = await request(app)
      .get('/tasks/645906542b43a050936c3bde'); // this is a valid, randomly generated ObjectId
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message', 'Invalid token');
  });

  it(`should respond with the error message "Task not found"`, async () => {
    const res = await request(app)
      .get('/tasks/645906542b43a050936c3bde') // this is a valid, randomly generated ObjectId
      .set('access_token', access_token);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message', 'Task not found');
  });

  it(`should respond with the newly added task's data`, async () => {
    const res = await request(app)
      .get(`/tasks/${taskId}`)
      .set('access_token', access_token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('_id', taskId);
  });
});

describe('POST /tasks/search', () => {
  it(`should respond with the error message "Invalid token"`, async () => {
    const res = await request(app)
      .post('/tasks/search')
      .send({ filter: 'image1' });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message', 'Invalid token');
  });

  it(`should respond with the container image search results from Docker Hub`, async () => {
    const res = await request(app)
      .post('/tasks/search')
      .set('access_token', access_token)
      .send({ filter: 'image1' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toStrictEqual(harborMasterMockRespSearchImagesOnDockerHub);
  });
});

describe('GET /tasks/:id/download', () => {
  it(`should respond with the error message "Invalid token"`, async () => {
    const res = await request(app)
      .get('/tasks/645906542b43a050936c3bde/download'); // this is a valid, randomly generated ObjectId
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message', 'Invalid token');
  });

  it(`should respond with the error message "Task not found"`, async () => {
    const res = await request(app)
      .get('/tasks/645906542b43a050936c3bde/download') // this is a valid, randomly generated ObjectId
      .set('access_token', access_token);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message', 'Task not found');
  });

  it(`should respond with the error message "Task is still running"`, async () => {
    const res = await request(app)
      .get(`/tasks/${taskId}/download`)
      .set('access_token', access_token);
    // Since taskId was started by a test case from before, the response should be an error.
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Task is still running');
  });

  it(`should respond with the error message "Task not yet started"`, async () => {
    // Testing the other error messages by modifying the status field first
    const task = await Task.findById(taskId);
    task.status = 'Created';
    await task.save();
    // Then perform the request
    const res = await request(app)
      .get(`/tasks/${taskId}/download`)
      .set('access_token', access_token);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Task not yet started');
  });

  it(`should respond with the error message "Task fail"`, async () => {
    // Testing the other error messages by modifying the status field first
    const task = await Task.findById(taskId);
    task.status = 'Failed';
    await task.save();
    // Then perform the request
    const res = await request(app)
      .get(`/tasks/${taskId}/download`)
      .set('access_token', access_token);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Task fail');
  });

  it(`should respond with a tar archive of /task/output contents that the client can download`, async () => {
    // Simulating a successful task
    const task = await Task.findById(taskId);
    task.status = 'Succeeded';
    await task.save();
    // Then perform the request
    const res = await request(app)
      .get(`/tasks/${taskId}/download`)
      .set('access_token', access_token);
    expect(res.status).toBe(200);
    expect(res.header).toHaveProperty('content-type', 'application/x-tar; charset=utf-8');
    expect(res.header).toHaveProperty('content-disposition', `attachment; filename="${task._id}-build-output.tar"`);
    expect(res.body).toStrictEqual(mockRespGetBuildOutput.data);
  });
});

describe('GET /tasks/:id/status', () => {
  it(`should respond with the error message "Invalid token"`, async () => {
    const res = await request(app)
      .get('/tasks/645906542b43a050936c3bde/status'); // this is a valid, randomly generated ObjectId
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message', 'Invalid token');
  });

  it(`should respond with the error message "Task not found"`, async () => {
    const res = await request(app)
      .get('/tasks/645906542b43a050936c3bde/status') // this is a valid, randomly generated ObjectId
      .set('access_token', access_token);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message', 'Task not found');
  });

  it(`should respond with the data of the task in question with its status updated to the correct value "Failed"`, async () => {
    const res = await request(app)
      .get(`/tasks/${taskId}/status`)
      .set('access_token', access_token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('_id', taskId);
    expect(res.body).toHaveProperty('status', 'Failed');
  });

  it(`should respond with the data of the task in question with its status updated to the correct value "Succeeded"`, async () => {
    const res = await request(app)
      .get(`/tasks/${taskId}/status`)
      .set('access_token', access_token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('_id', taskId);
    expect(res.body).toHaveProperty('status', 'Succeeded');
  });
});