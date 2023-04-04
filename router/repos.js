const RepoController = require('../controllers/repo-controller');
const router = require('express').Router();

router.get('/', RepoController.listRepos);
router.post('/', RepoController.addRepo);
router.patch('/', RepoController.updateVersion);

module.exports = router;