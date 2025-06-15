const mysql = require("mysql2");
const config = require("./config");

const pool = mysql.createPool(config.database);

const db = pool.promise();

const testConnection = async () => {
  try {
    const connection = await db.getConnection();
    console.log("Database connected successfully");
    connection.release();
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

testConnection();

module.exports = db;
