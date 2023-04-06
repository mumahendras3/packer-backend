const router = require('express').Router();
const registerRouter = require('./register');
const loginRouter = require('./login');
const reposRouter = require('./repos');
const tasksRouter = require('./tasks');
const filesRouter = require('./files');
const authenticate = require('../middlewares/authentication');

// Publicly accessible
router.use('/register', registerRouter);
router.use('/login', loginRouter);

// Protected by authentication
router.use(authenticate);
router.use('/repos', reposRouter);
router.use('/tasks', tasksRouter);
router.use('/files', filesRouter);

module.exports = router;