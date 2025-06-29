const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const config = require("../config/config");
const ApiResponse = require("../utils/response");

class AuthController {
  async register(req, res) {
    try {
      const { email, password, name } = req.body;

      const [existingUser] = await db.execute(
        "SELECT id FROM users WHERE email = ?",
        [email]
      );

      if (existingUser.length > 0) {
        return ApiResponse.badRequest(res, "User already exists");
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const [result] = await db.execute(
        "INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, NOW())",
        [name, email, hashedPassword]
      );

      const token = jwt.sign(
        { id: result.insertId, email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      return ApiResponse.created(
        res,
        {
          user: { id: result.insertId, name, email },
          token,
        },
        "User registered successfully"
      );
    } catch (error) {
      console.error("Register error:", error);
      return ApiResponse.error(res, "Registration failed");
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      const [users] = await db.execute(
        "SELECT id, name, email, role, password FROM users WHERE email = ?",
        [email]
      );

      if (users.length === 0) {
        return ApiResponse.unauthorized(res, "Invalid email or password");
      }

      const user = users[0];

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return ApiResponse.unauthorized(res, "Invalid email or password");
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      return ApiResponse.success(
        res,
        {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          token,
        },
        "Login successful"
      );
    } catch (error) {
      console.error("Login error:", error);
      return ApiResponse.error(res, "Login failed");
    }
  }

  async logout(req, res) {
    try {
      jwt.destroy(req.token);

      return ApiResponse.success(res, null, "Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      return ApiResponse.error(res, "Logout failed");
    }
  }

  async refreshToken(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return ApiResponse.badRequest(res, "Token is required");
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      const newToken = jwt.sign(
        { id: decoded.id, email: decoded.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      return ApiResponse.success(res, { token: newToken }, "Token refreshed");
    } catch (error) {
      return ApiResponse.unauthorized(res, "Invalid token");
    }
  }
}

module.exports = new AuthController();
