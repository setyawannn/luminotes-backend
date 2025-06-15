const express = require("express");
const noteController = require("../controllers/noteController");
const auth = require("../middleware/auth");

const router = express.Router();
const uploadMiddleware = require('../middleware/uploadMiddleware');

router.use(auth);

router.post("/", uploadMiddleware, noteController.createNote);
router.get("/", noteController.getAllNotes);
router.get("/:id", noteController.getNoteById);
router.put("/:id", uploadMiddleware, noteController.updateNote);
router.delete("/:id", noteController.deleteNote);

module.exports = router;
