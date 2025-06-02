const db = require("../config/database");
const ApiResponse = require("../utils/response");

class UserController {
  async getAllUsers(req, res) {
    try {
      const { role } = req.user;
      if (role !== "admin") {
        return ApiResponse.forbidden(res, "Access denied. Admins only.");
      }
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const [users] = await db.execute(
        "SELECT id, name, email, created_at FROM users LIMIT ? OFFSET ?",
        [limit, offset]
      );

      const [countResult] = await db.execute(
        "SELECT COUNT(*) as total FROM users"
      );
      const total = countResult[0].total;

      return ApiResponse.success(res, {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Get users error:", error);
      return ApiResponse.error(res, "Failed to fetch users");
    }
  }

  async getUserById(req, res) {
    try {
      const { role } = req.user;
      if (role !== "admin") {
        return ApiResponse.forbidden(res, "Access denied. Admins only.");
      }
      const { id } = req.params;

      const [users] = await db.execute(
        "SELECT id, name, email, created_at FROM users WHERE id = ?",
        [id]
      );

      if (users.length === 0) {
        return ApiResponse.notFound(res, "User not found");
      }

      return ApiResponse.success(res, users[0]);
    } catch (error) {
      console.error("Get user error:", error);
      return ApiResponse.error(res, "Failed to fetch user");
    }
  }

  async updateUser(req, res) {
    try {
      const { role } = req.user;
      if (role !== "admin") {
        return ApiResponse.forbidden(res, "Access denied. Admins only.");
      }
      const { id } = req.params;
      const { name, email } = req.body;

      if (!name && !email) {
        return ApiResponse.badRequest(res, "No fields to update provided.");
      }

      const updateFields = [];
      const values = [];

      if (name) {
        updateFields.push("name = ?");
        values.push(name);
      }
      if (email) {
        updateFields.push("email = ?");
        values.push(email);
      }

      const setClause = updateFields.join(", ");

      const sql = `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = ?`;

      values.push(id);

      const [result] = await db.execute(sql, values);

      if (result.affectedRows === 0) {
        return ApiResponse.notFound(res, "User not found");
      }

      return ApiResponse.success(res, null, "User updated successfully");
    } catch (error) {
      console.error("Update user error:", error);
      if (error.code === "ER_DUP_ENTRY") {
        return ApiResponse.badRequest(
          res,
          "Email already in use by another account."
        );
      }
      return ApiResponse.error(res, "Failed to update user");
    }
  }

  async deleteUser(req, res) {
    try {
      const { role } = req.user;
      if (role !== "admin") {
        return ApiResponse.forbidden(res, "Access denied. Admins only.");
      }
      const { id } = req.params;

      const [result] = await db.execute("DELETE FROM users WHERE id = ?", [id]);

      if (result.affectedRows === 0) {
        return ApiResponse.notFound(res, "User not found");
      }

      return ApiResponse.success(res, null, "User deleted successfully");
    } catch (error) {
      console.error("Delete user error:", error);
      return ApiResponse.error(res, "Failed to delete user");
    }
  }
}

module.exports = new UserController();
