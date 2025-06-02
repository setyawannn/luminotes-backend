const express = require("express");
const authRoutes = require("./auth");
const userRoutes = require("./users");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);

router.get("/", (req, res) => {
  res.json({
    message: "Luminotes API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
    },
  });
});

module.exports = router;
