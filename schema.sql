-- Create the database
CREATE DATABASE IF NOT EXISTS github_analyzer
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE github_analyzer;

-- ── Main profiles table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS github_profiles (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  username            VARCHAR(100)    NOT NULL UNIQUE COMMENT 'GitHub login / handle',
  name                VARCHAR(255)                    COMMENT 'Display name',
  bio                 TEXT                            COMMENT 'Profile bio',
  public_repos        INT             DEFAULT 0,
  followers           INT             DEFAULT 0,
  following           INT             DEFAULT 0,
  profile_url         VARCHAR(255)                    COMMENT 'https://github.com/<username>',
  avatar_url          VARCHAR(500)                    COMMENT 'Profile picture URL',

  -- Bonus insight columns
  repo_follower_ratio DECIMAL(10,4)   DEFAULT 0       COMMENT 'public_repos / followers',
  popularity_score    DECIMAL(10,4)   DEFAULT 0       COMMENT 'Weighted engagement score',

  -- Timestamps
  created_at          DATETIME                        COMMENT 'GitHub account creation date',
  analyzed_at         DATETIME DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP
                               COMMENT 'Last time this profile was analysed'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Top repositories table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS top_repositories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(100)  NOT NULL,
  repo_name   VARCHAR(255)  NOT NULL,
  description TEXT,
  stars       INT           DEFAULT 0,
  forks       INT           DEFAULT 0,
  language    VARCHAR(100),
  repo_url    VARCHAR(500),

  FOREIGN KEY (username)
    REFERENCES github_profiles(username)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Indexes for common lookups ───────────────────────────────
CREATE INDEX idx_profiles_analyzed_at   ON github_profiles (analyzed_at);
CREATE INDEX idx_repos_username_stars   ON top_repositories (username, stars DESC);
