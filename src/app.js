
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const config = require("./config/config");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);


app.use(errorHandler);

module.exports = app;