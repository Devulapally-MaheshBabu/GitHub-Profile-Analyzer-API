// models/profileModel.js

const { query } = require("../config/db");

// ── Upsert a profile ─────────────────────────────────────────

async function upsertProfile(profile) {
  const sql = `
    INSERT INTO github_profiles
      (username, name, bio, public_repos, followers, following,
       profile_url, avatar_url, repo_follower_ratio, popularity_score,
       created_at, analyzed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      name                = VALUES(name),
      bio                 = VALUES(bio),
      public_repos        = VALUES(public_repos),
      followers           = VALUES(followers),
      following           = VALUES(following),
      profile_url         = VALUES(profile_url),
      avatar_url          = VALUES(avatar_url),
      repo_follower_ratio = VALUES(repo_follower_ratio),
      popularity_score    = VALUES(popularity_score),
      created_at          = VALUES(created_at),
      analyzed_at         = NOW()
  `;

  return query(sql, [
    profile.username,
    profile.name,
    profile.bio,
    profile.public_repos,
    profile.followers,
    profile.following,
    profile.profile_url,
    profile.avatar_url,
    profile.repo_follower_ratio,
    profile.popularity_score,
    profile.created_at,
  ]);
}

// ── Save top repositories ─────────────────────────────────────
// Delete the previous set for this user, then bulk-insert the new ones.
async function saveTopRepositories(username, repos) {
  // Remove old data first (clean slate)
  await query(`DELETE FROM top_repositories WHERE username = ?`, [username]);

  if (!repos || repos.length === 0) return;

  // Build a multi-row INSERT
  const placeholders = repos.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
  const values = repos.flatMap((r) => [
    username,
    r.repo_name,
    r.description,
    r.stars,
    r.forks,
    r.language,
    r.repo_url,
  ]);

  return query(
    `INSERT INTO top_repositories
       (username, repo_name, description, stars, forks, language, repo_url)
     VALUES ${placeholders}`,
    values
  );
}

// ── Find one profile by username ──────────────────────────────
async function findProfileByUsername(username) {
  const rows = await query(
    `SELECT * FROM github_profiles WHERE username = ?`,
    [username]
  );
  return rows[0] || null; // return undefined-safe null
}

// ── Find top repos for a username ─────────────────────────────
async function findTopReposByUsername(username) {
  return query(
    `SELECT * FROM top_repositories WHERE username = ? ORDER BY stars DESC`,
    [username]
  );
}

// ── Fetch every analysed profile ─────────────────────────────
async function getAllProfiles() {
  return query(
    `SELECT * FROM github_profiles ORDER BY analyzed_at DESC`
  );
}

module.exports = {
  upsertProfile,
  saveTopRepositories,
  findProfileByUsername,
  findTopReposByUsername,
  getAllProfiles,
};
