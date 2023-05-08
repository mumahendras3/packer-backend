const TaskController = require("../controllers/task-controller");
const router = require("express").Router();

router.get("/", TaskController.listTasks);
router.post("/", TaskController.addTask);
router.get("/search", TaskController.searchDockerHubImage);
router.post("/:id", TaskController.startTask);
router.delete("/:id", TaskController.deleteTask);
router.get("/:id/status", TaskController.checkTask);
router.get("/:id/logs", TaskController.getTaskLogs);
router.get("/:id/download", TaskController.downloadOutput);

module.exports = router;
