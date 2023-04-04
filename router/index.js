const router = require('express').Router();
const registerRouter = require('./register');
const loginRouter = require('./login');

router.use('/register', registerRouter);
router.use('/login', loginRouter);

module.exports = router;