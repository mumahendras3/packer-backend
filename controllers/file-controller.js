const File = require("../models/file");

class FileController {
  static async handleFileUploads(req, res, next) {
    try {
      const uploadedFiles = [];
      for (const file of req.files) {
        const fileEntry = new File({
          name: file.originalname,
          path: file.path,
          mimeType: file.mimetype
        });
        await fileEntry.save();
        uploadedFiles.push({
          id: fileEntry._id,
          name: fileEntry.name
        });
      }
      res.status(201).json({
        message: "Files uploaded successfully",
        files: uploadedFiles
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = FileController;