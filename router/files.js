const FileController = require('../controllers/file-controller');
const multer = require('multer');
const storage = multer.diskStorage({
  destination: 'files',
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
});
const upload = multer({ storage: storage })
const router = require('express').Router();

router.post('/', upload.array('additionalFiles'), FileController.handleFileUploads);

module.exports = router;