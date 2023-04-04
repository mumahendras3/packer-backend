const UserController = require('../controllers/user-controller');
const router = require('express').Router();

router.post('/', UserController.register);

module.exports = router;