// Imports
const UserController = require('./controllers/user-controller');
const errorHandler = require('./middlewares/error-handler');
const router = require('./router');
const cors = require('cors');

// Initializations
const express = require('express');
const app = express();

// Global configurations
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Setup the routes
app.use(router);

// Error handler
app.use(errorHandler);

module.exports = app;