const TaskController = require('../controllers/task-controller');
const router = require('express').Router();

router.get('/', TaskController.listTasks);
router.post('/', TaskController.addTask);

module.exports = router;