const express = require("express");
const authRoutes = require("./auth");
const userRoutes = require("./users");
const teamRoutes = require("./teams");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/teams", teamRoutes);

router.get("/", (req, res) => {
  res.json({
    message: "Luminotes API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      teams: "/api/teams",
    },
  });
});

module.exports = router;
