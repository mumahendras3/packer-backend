const router = require('express').Router();
const registerRouter = require('./register');
const loginRouter = require('./login');
const reposRouter = require('./repos');
const authenticate = require('../middlewares/authentication');

// Publicly accessible
router.use('/register', registerRouter);
router.use('/login', loginRouter);

// Protected by authentication
router.use(authenticate);
router.use('/repos', reposRouter);

module.exports = router;