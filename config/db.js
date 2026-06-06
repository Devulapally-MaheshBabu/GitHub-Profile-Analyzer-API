// config/db.js
const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "github_analyzer",
  waitForConnections: true, 
  connectionLimit: 10,      
  queueLimit: 0,            
});


async function initDB() {
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

    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || "github_analyzer"}\``
    );
    await conn.query(
      `USE \`${process.env.DB_NAME || "github_analyzer"}\``
    );

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
        created_at   TIMESTAMP NULL,           -- when the GitHub account was created
        analyzed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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

async function query(sql, params = []) {
  const [results] = await pool.execute(sql, params);
  return results;
}

module.exports = { pool, query, initDB };
