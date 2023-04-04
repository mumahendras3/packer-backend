const router = require('express').Router();
const registerRouter = require('./register');

router.use('/register', registerRouter);

module.exports = router;