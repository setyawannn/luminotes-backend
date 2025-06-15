const db = require("../config/database");
const ApiResponse = require("../utils/response");
const fs = require("fs").promises;
const path = require("path");


const deleteFile = async (fileUrl) => {
  if (!fileUrl) return;

  try {
    const url = new URL(fileUrl);
    const localPath = path.join(__dirname, '..', '..', 'public', url.pathname);

    await fs.unlink(localPath);
    console.log(`Successfully deleted file: ${localPath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error("Error deleting file:", error);
    }
  }
};

class NoteController {

  async createNote(req, res) {
    let newFiles = {};
    try {
      const { title, description, topics, is_public, team_id } = req.body;
      const creator_id = req.user.id;

      if (team_id) {
        const [members] = await db.execute(
          "SELECT * FROM team_members WHERE team_id = ? AND user_id = ?",
          [team_id, creator_id]
        );
        if (members.length === 0) {
          return ApiResponse.forbidden(res, "You are not a member of this team.");
        }
      }

      let fullFileUrl = null;
      if (req.files && req.files.file) {
        const relativePath = `/uploads/${req.files.file[0].filename}`;
        fullFileUrl = `${req.protocol}://${req.get("host")}${relativePath}`;
        newFiles.file = fullFileUrl;
      }

      let fullThumbnailUrl = null;
      if (req.files && req.files.thumbnail) {
        const relativePath = `/uploads/${req.files.thumbnail[0].filename}`;
        fullThumbnailUrl = `${req.protocol}://${req.get("host")}${relativePath}`;
        newFiles.thumbnail = fullThumbnailUrl;
      }

      const [result] = await db.execute(
        `INSERT INTO notes (title, description, topics, is_public, team_id, file, thumbnail, creator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, description || null, topics || null, is_public || 0, team_id || null, fullFileUrl, fullThumbnailUrl, creator_id]
      );

      const [newNote] = await db.execute("SELECT * FROM notes WHERE id = ?", [result.insertId]);
      return ApiResponse.created(res, newNote[0], "Note created successfully");

    } catch (error) {
      await deleteFile(newFiles.file);
      await deleteFile(newFiles.thumbnail);

      console.error("Create Note error:", error);
      return ApiResponse.error(res, "Failed to create note");
    }
  }


  async getAllNotes(req, res) {
    try {
      const { search, status, creator } = req.query;

      let baseQuery = `
        SELECT
          n.id, n.title, n.description, n.topics, n.is_public,
          n.team_id, n.thumbnail, n.status, n.creator_id, n.created_at, n.updated_at,
          t.name as team_name,
          u.name as creator_name
        FROM notes n
        LEFT JOIN teams t ON n.team_id = t.id
        LEFT JOIN users u ON n.creator_id = u.id
      `;

      const whereClauses = [];
      const params = [];

      whereClauses.push(`n.is_public = 1`);

      if (search) {
        whereClauses.push(`(n.title LIKE ? OR n.description LIKE ?)`);
        params.push(`%${search}%`, `%${search}%`);
      }

      if (status) {
        whereClauses.push(`n.status = ?`);
        params.push(status);
      }

      if (creator) {
        whereClauses.push(`n.creator_id = ?`);
        params.push(creator);
      }

      if (whereClauses.length > 0) {
        baseQuery += ` WHERE ${whereClauses.join(" AND ")}`;
      }

      baseQuery += ` ORDER BY n.updated_at DESC`;

      const [notes] = await db.execute(baseQuery, params);

      return ApiResponse.success(res, notes, "Notes retrieved successfully");
    } catch (error) {
      console.error("Get All Notes error:", error);
      return ApiResponse.error(res, "Failed to retrieve notes");
    }
  }

  async getNoteById(req, res) {
    try {
      const { id: noteId } = req.params;
      const userId = req.user.id;

      const [notes] = await db.execute(
        `
        SELECT
          n.*,
          u.name as creator_name,
          t.name as team_name
        FROM notes n
        JOIN users u ON n.creator_id = u.id
        LEFT JOIN teams t ON n.team_id = t.id
        LEFT JOIN team_members tm ON n.team_id = tm.team_id
        WHERE n.id = ? AND (n.creator_id = ? OR n.is_public = 1 OR tm.user_id = ?)
        GROUP BY n.id
        LIMIT 1
        `,
        [noteId, userId, userId]
      );

      if (notes.length === 0) {
        return ApiResponse.notFound(
          res,
          "Note not found or you do not have permission to view it"
        );
      }

      return ApiResponse.success(res, notes[0], "Note retrieved successfully");
    } catch (error) {
      console.error("Get Note by ID error:", error);
      return ApiResponse.error(res, "Failed to retrieve note");
    }
  }

  async updateNote(req, res) {
    try {
      const { id: noteId } = req.params;
      const { title, description, topics, is_public, team_id } = req.body;
      const userId = req.user.id;

      if (team_id) {
        const [members] = await db.execute(
          "SELECT * FROM team_members WHERE team_id = ? AND user_id = ?",
          [team_id, userId]
        );
        if (members.length === 0) {
          return ApiResponse.forbidden(res, "You are not a member of the target team.");
        }
      }

      const [notes] = await db.execute("SELECT * FROM notes WHERE id = ?", [noteId]);
      if (notes.length === 0) return ApiResponse.notFound(res, "Note not found");
      if (notes[0].creator_id !== userId) return ApiResponse.forbidden(res, "You do not have permission to edit this note");

      const oldNote = notes[0];

      let fileUrl = oldNote.file;
      if (req.files && req.files.file) {
        await deleteFile(oldNote.file);
        const relativePath = `/uploads/${req.files.file[0].filename}`;
        fileUrl = `${req.protocol}://${req.get("host")}${relativePath}`;
      }

      let thumbnailUrl = oldNote.thumbnail;
      if (req.files && req.files.thumbnail) {
        await deleteFile(oldNote.thumbnail);
        const relativePath = `/uploads/${req.files.thumbnail[0].filename}`;
        thumbnailUrl = `${req.protocol}://${req.get("host")}${relativePath}`;
      }

      await db.execute(
        `UPDATE notes SET title = ?, description = ?, topics = ?, is_public = ?, file = ?, thumbnail = ? WHERE id = ?`,
        [title, description, topics, is_public, fileUrl, thumbnailUrl, noteId]
      );

      const [updatedNote] = await db.execute("SELECT * FROM notes WHERE id = ?", [noteId]);
      return ApiResponse.success(res, updatedNote[0], "Note updated successfully");

    } catch (error) {
      console.error("Update Note error:", error);
      return ApiResponse.error(res, "Failed to update note");
    }
  }


  async deleteNote(req, res) {
    try {
      const { id: noteId } = req.params;
      const userId = req.user.id;

      const [notes] = await db.execute("SELECT * FROM notes WHERE id = ?", [noteId]);
      if (notes.length === 0) return ApiResponse.notFound(res, "Note not found");
      if (notes[0].creator_id !== userId) return ApiResponse.forbidden(res, "You do not have permission to delete this note");

      await deleteFile(notes[0].file);
      await deleteFile(notes[0].thumbnail);

      await db.execute("DELETE FROM notes WHERE id = ?", [noteId]);
      return ApiResponse.success(res, null, "Note deleted successfully");
    } catch (error) {
      console.error("Delete Note error:", error);
      return ApiResponse.error(res, "Failed to delete note");
    }
  }


}

module.exports = new NoteController();