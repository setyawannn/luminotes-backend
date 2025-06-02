const jwt = require("jsonwebtoken");
const config = require("../config/config");
const ApiResponse = require("../utils/response");

const auth = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return ApiResponse.unauthorized(res, "Access denied. No token provided.");
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    return ApiResponse.unauthorized(res, "Invalid token.");
  }
};

module.exports = auth;
