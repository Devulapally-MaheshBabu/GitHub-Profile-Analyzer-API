// controllers/profileController.js

const {
  fetchGitHubProfile,
  fetchTopRepositories,
  parseProfileData,
} = require("../services/githubService");

const {
  upsertProfile,
  saveTopRepositories,
  findProfileByUsername,
  findTopReposByUsername,
  getAllProfiles,
} = require("../models/profileModel");

// ── Helper: send a standard error response ───────────────────
function sendError(res, status, message, details = null) {
  const body = { success: false, message };
  if (details) body.details = details;
  return res.status(status).json(body);
}

// ── POST /api/profiles/analyze/:username ─────────────────────
async function analyzeProfile(req, res) {
  const startTime = Date.now(); // ← bonus: response time logging

  const { username } = req.params;

  // ── Basic validation ─────────────────────────────────────
  const usernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
  if (!username || !usernameRegex.test(username)) {
    return sendError(res, 400, "Invalid GitHub username format.");
  }

  try {
    const rawProfile = await fetchGitHubProfile(username);
    const rawRepos   = await fetchTopRepositories(username);

    const profileData = parseProfileData(rawProfile);

    await upsertProfile(profileData);
    await saveTopRepositories(username, rawRepos);

    const savedProfile = await findProfileByUsername(username);
    const topRepos     = await findTopReposByUsername(username);

    const responseTimeMs = Date.now() - startTime;
    console.log(`⏱️  analyzeProfile("${username}") completed in ${responseTimeMs}ms`);

    return res.status(201).json({
      success: true,
      message: `Profile for "${username}" analysed and saved.`,
      response_time_ms: responseTimeMs,
      data: {
        profile:          savedProfile,
        top_repositories: topRepos,
        insights: {
          repo_follower_ratio: savedProfile.repo_follower_ratio,
          popularity_score:    savedProfile.popularity_score,
        },
      },
    });
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    console.error(`❌  analyzeProfile error (${responseTimeMs}ms):`, error.message);

    // Map known error types to appropriate HTTP status codes
    if (error.message.includes("not found")) {
      return sendError(res, 404, error.message);
    }
    if (error.message.includes("rate limit")) {
      return sendError(res, 429, error.message);
    }
    if (error.message.includes("GitHub API error")) {
      return sendError(res, 502, "Failed to fetch data from GitHub.", error.message);
    }
    return sendError(res, 500, "Internal server error.", error.message);
  }
}

// ── GET /api/profiles ─────────────────────────────────────────
// Returns every analysed profile, ordered by most recently analysed.
async function getAllProfilesHandler(req, res) {
  const startTime = Date.now();
  try {
    const profiles = await getAllProfiles();
    const responseTimeMs = Date.now() - startTime;

    console.log(`⏱️  getAllProfiles completed in ${responseTimeMs}ms`);

    return res.status(200).json({
      success: true,
      count:            profiles.length,
      response_time_ms: responseTimeMs,
      data:             profiles,
    });
  } catch (error) {
    console.error("❌  getAllProfiles error:", error.message);
    return sendError(res, 500, "Failed to retrieve profiles.", error.message);
  }
}

// ── GET /api/profiles/:username ───────────────────────────────
// Returns a single profile + its top repositories from the database.
async function getProfileByUsername(req, res) {
  const startTime = Date.now();
  const { username } = req.params;

  try {
    const profile = await findProfileByUsername(username);

    if (!profile) {
      return sendError(
        res,
        404,
        `Profile "${username}" not found in the database. Analyse it first via POST /api/profiles/analyze/${username}`
      );
    }

    const topRepos       = await findTopReposByUsername(username);
    const responseTimeMs = Date.now() - startTime;

    console.log(`⏱️  getProfileByUsername("${username}") completed in ${responseTimeMs}ms`);

    return res.status(200).json({
      success: true,
      response_time_ms: responseTimeMs,
      data: {
        profile,
        top_repositories: topRepos,
        insights: {
          repo_follower_ratio: profile.repo_follower_ratio,
          popularity_score:    profile.popularity_score,
        },
      },
    });
  } catch (error) {
    console.error(`❌  getProfileByUsername error:`, error.message);
    return sendError(res, 500, "Failed to retrieve profile.", error.message);
  }
}

module.exports = { analyzeProfile, getAllProfilesHandler, getProfileByUsername };
