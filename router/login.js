const UserController = require('../controllers/user-controller');
const router = require('express').Router();

router.post('/', UserController.login);

module.exports = router;