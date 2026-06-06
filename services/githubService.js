// services/githubService.js
// ─────────────────────────────────────────────────────────────
// Responsible for ALL communication with the GitHub Public API.
// Keeping this in a separate service layer means the rest of the
// app never has to know about Axios or GitHub's API structure.
// ─────────────────────────────────────────────────────────────

const axios = require("axios");
require("dotenv").config();

// Base URL for GitHub REST API v3
const GITHUB_API_BASE = "https://api.github.com";

// Build request headers.  Adding a token raises the rate limit
// from 60 req/hr (unauthenticated) to 5 000 req/hr.
function getHeaders() {
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "github-profile-analyzer",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

// ── Fetch a user's public profile ────────────────────────────
async function fetchGitHubProfile(username) {
  try {
    const response = await axios.get(
      `${GITHUB_API_BASE}/users/${username}`,
      { headers: getHeaders(), timeout: 10_000 }
    );
    return response.data;
  } catch (error) {
    // Translate GitHub HTTP errors into descriptive messages
    if (error.response) {
      const status = error.response.status;
      if (status === 404) throw new Error(`GitHub user "${username}" not found.`);
      if (status === 403) throw new Error("GitHub API rate limit exceeded. Add a GITHUB_TOKEN to .env to raise the limit.");
      throw new Error(`GitHub API error: ${status} ${error.response.statusText}`);
    }
    if (error.code === "ECONNABORTED") throw new Error("GitHub API request timed out.");
    throw new Error(`Network error: ${error.message}`);
  }
}

// ── Fetch top 5 repositories by star count ───────────────────
// GitHub's sort options: created | updated | pushed | full_name
// We fetch the first page sorted by stars (most starred first).
async function fetchTopRepositories(username) {
  try {
    const response = await axios.get(
      `${GITHUB_API_BASE}/users/${username}/repos`,
      {
        headers: getHeaders(),
        timeout: 10_000,
        params: {
          sort: "stargazers",   // sort by stars descending
          direction: "desc",
          per_page: 5,          // only need the top 5
          page: 1,
        },
      }
    );

    // Shape each repo into a clean object
    return response.data.map((repo) => ({
      repo_name:   repo.name,
      description: repo.description || null,
      stars:       repo.stargazers_count,
      forks:       repo.forks_count,
      language:    repo.language || null,
      repo_url:    repo.html_url,
    }));
  } catch (error) {
    // Top repos are a bonus feature – don't crash the whole request
    console.warn(`⚠️  Could not fetch repos for "${username}":`, error.message);
    return [];
  }
}

// ── Parse raw GitHub user data into our schema ───────────────
function parseProfileData(rawData) {
  const followers    = rawData.followers    || 0;
  const publicRepos  = rawData.public_repos || 0;
  const following    = rawData.following    || 0;

  // ── Bonus: Repository-to-Follower Ratio ─────────────────
  // How many repos does the user have per follower?
  // A high value may indicate an active contributor with fewer followers.
  const repoFollowerRatio =
    followers > 0 ? parseFloat((publicRepos / followers).toFixed(4)) : publicRepos;

  // ── Bonus: Popularity Score ──────────────────────────────
  // Simple weighted formula (adjust weights as needed):
  //   followers × 1.5  +  public_repos × 0.5  −  following × 0.1
  // Clamped to 0 so it's never negative.
  const popularityScore = parseFloat(
    Math.max(0, followers * 1.5 + publicRepos * 0.5 - following * 0.1).toFixed(4)
  );

  return {
    username:           rawData.login,
    name:               rawData.name         || null,
    bio:                rawData.bio          || null,
    public_repos:       publicRepos,
    followers:          followers,
    following:          following,
    profile_url:        rawData.html_url,
    avatar_url:         rawData.avatar_url,
    repo_follower_ratio: repoFollowerRatio,
    popularity_score:   popularityScore,
    created_at:         rawData.created_at
      ? new Date(rawData.created_at).toISOString().slice(0, 19).replace("T", " ")
      : null,
  };
}

module.exports = { fetchGitHubProfile, fetchTopRepositories, parseProfileData };
