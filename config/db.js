// config/db.js
// ─────────────────────────────────────────────────────────────
// Creates a MySQL connection pool and exports a helper to run
// parameterised queries.  A pool is preferred over a single
// connection because it automatically handles reconnections and
// supports concurrent requests.
// ─────────────────────────────────────────────────────────────

const mysql = require("mysql2/promise");
require("dotenv").config();

// Create a pool of connections using environment variables
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "github_analyzer",
  waitForConnections: true, // queue requests when all connections are busy
  connectionLimit: 10,      // max simultaneous connections in the pool
  queueLimit: 0,            // 0 = unlimited queue
});

// ── Initialise the database schema ───────────────────────────
// Called once at startup.  Creates the database and the
// github_profiles table if they do not already exist.
async function initDB() {
  // First connect WITHOUT specifying a database so we can CREATE it
  const tempPool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    waitForConnections: true,
    connectionLimit: 2,
  });

  try {
    const conn = await tempPool.getConnection();

    // Create the database if it doesn't exist
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || "github_analyzer"}\``
    );
    await conn.query(
      `USE \`${process.env.DB_NAME || "github_analyzer"}\``
    );

    // ── Main profiles table ──────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS github_profiles (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        username     VARCHAR(100) NOT NULL UNIQUE,
        name         VARCHAR(255),
        bio          TEXT,
        public_repos INT DEFAULT 0,
        followers    INT DEFAULT 0,
        following    INT DEFAULT 0,
        profile_url  VARCHAR(255),
        avatar_url   VARCHAR(500),
        -- Bonus insight columns
        repo_follower_ratio DECIMAL(10,4) DEFAULT 0,
        popularity_score    DECIMAL(10,4) DEFAULT 0,
        -- Timestamps
        created_at   DATETIME,           -- when the GitHub account was created
        analyzed_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // ── Top repositories table ───────────────────────────────
    // Stores up to 5 most-starred repos per profile (bonus feature)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS top_repositories (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        username    VARCHAR(100) NOT NULL,
        repo_name   VARCHAR(255) NOT NULL,
        description TEXT,
        stars       INT DEFAULT 0,
        forks       INT DEFAULT 0,
        language    VARCHAR(100),
        repo_url    VARCHAR(500),
        FOREIGN KEY (username) REFERENCES github_profiles(username) ON DELETE CASCADE
      )
    `);

    conn.release();
    await tempPool.end();
    console.log("✅  Database and tables ready.");
  } catch (err) {
    console.error("❌  Database initialisation failed:", err.message);
    throw err;
  }
}

// ── Simple query helper ───────────────────────────────────────
// Wraps pool.execute so controllers/models don't need to import
// the pool directly.
async function query(sql, params = []) {
  const [results] = await pool.execute(sql, params);
  return results;
}

module.exports = { pool, query, initDB };
