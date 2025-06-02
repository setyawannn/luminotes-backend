const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const config = require("./config/config");

const app = express();

app.use(helmet());
app.use(cors());

app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use(errorHandler);

// app.use("*", (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: "Route not found",
//   });
// });

module.exports = app;
