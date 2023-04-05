const TaskController = require('../controllers/task-controller');
const router = require('express').Router();

router.get('/', TaskController.listTasks);
router.post('/', TaskController.addTask);
router.post('/:id', TaskController.startTask);
router.get('/:id/status', TaskController.checkTask);

module.exports = router;