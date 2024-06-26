const fs = require("fs");
const path = require("path");
const router = require("express").Router();
const User = require("../models/User.model");
const Upload = require("../models/Upload.model");
const isAuthenticated = require("../middlewares/isAuthenticated.middleware");
const upload = require("../configs/multer.config");
const uploadVideo = require("../utils/uploadVideo");
const uploadThumbnail = require("../utils/uploadThumbnail");
const downloadVideo = require("../utils/downloadVideo");

/**
 * @route GET /uploads
 * @access Private
 * @desc Fetch all uploads for homepage
 */
router.get("/", async (req, res) => {
  const uploads = await Upload.find({});
  if (!uploads || uploads.length === 0)
    return res.status(404).json({ message: "No uploads found" });
  res.status(200).json(uploads);
});

/**
 * @route GET /uploads/:id
 * @access Private
 * @desc Fetch a specific upload by ID
 */
router.get("/:id", async (req, res) => {
  const uploadID = req.params.id;
  const upload = await Upload.findById(uploadID);
  if (!upload) return res.status(404).json({ message: "Upload not found" });

  // Download the video from Azure Blob Storage
  const videoStream = await downloadVideo(upload.videoURL);

  // Set the content type and filename in the response headers
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${upload.blobName}`
  );

  // Pipe the video stream to the response
  /** pipe()
   * Used to funnel the data from the video file directly into the HTTP response
   * without having to manually read the data from the source stream
   * and then write it to the destination stream.
   */
  videoStream.pipe(res);
});

/**
 * @route POST /uploads/upload
 * @access Private
 * @desc Create a new upload
 */
router.post(
  "/upload",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  async (req, res) => {
    // Get the file details from the request object
    const { userID, title, description } = req.body;

    // Check if the video and thumbnail files are present
    if (!req.files || !req.files.video || !req.files.thumbnail) {
      return res.status(400).json({ message: "Video and thumbnail required" });
    }
    // Video must not be greater than 50MB
    if (req.files.video[0].size > 50 * 1024 * 1024) {
      return res.status(400).json({ message: "Video must be less than 50MB" });
    }
    // Thumbnail must not be greater than 5MB
    if (req.files.thumbnail[0].size > 5 * 1024 * 1024) {
      return res
        .status(400)
        .json({ message: "Thumbnail must be less than 5MB" });
    }

    // Get the video and thumbnail file objects
    const videoFilePath = req.files.video[0].path;
    const thumbnailFilePath = req.files.thumbnail[0].path;

    // Create a new upload then delete the files
    await uploadVideo(videoFilePath).then(() => {
      fs.unlinkSync(videoFilePath);
    });

    let thumbnailURL = "";
    await uploadThumbnail(thumbnailFilePath).then((url) => {
      thumbnailURL = url;
      fs.unlinkSync(thumbnailFilePath);
    });

    const newUpload = await Upload.create({
      userID,
      title,
      description,
      videoURL: path.basename(videoFilePath),
      thumbnailURL: thumbnailURL,
    });

    // Update the user's uploads array
    await User.findByIdAndUpdate(userID, { $push: { uploads: newUpload._id } });
    res.status(201).json(newUpload);
  }
);

module.exports = router;
