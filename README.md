# GitHub Profile Analyzer API 🚀

A beginner-friendly REST API built with **Node.js**, **Express.js**, **MySQL**, and the **GitHub Public API**.  
It fetches any GitHub user's public profile, computes useful insights, stores everything in MySQL, and exposes three clean REST endpoints.

---

## Features

| Feature | Details |
|---|---|
| Fetch GitHub profile | Uses GitHub REST API v3 |
| Persist to MySQL | Auto-creates DB + tables on startup |
| Top 5 repositories | Sorted by stars |
| Popularity score | Weighted formula |
| Repo-to-follower ratio | `public_repos / followers` |
| Response time logging | Printed to console for every request |
| Input validation | GitHub username format enforced |
| Error handling | 400 / 404 / 429 / 500 / 502 |

---

## Project Structure

```
github-profile-analyzer/
│
├── config/
│   └── db.js               # MySQL pool + initDB()
│
├── controllers/
│   └── profileController.js # Request / response logic
│
├── routes/
│   └── profileRoutes.js     # Express router
│
├── services/
│   └── githubService.js     # GitHub API calls + data parsing
│
├── models/
│   └── profileModel.js      # All SQL queries
│
├── postman/
│   └── GitHub_Profile_Analyzer.postman_collection.json
│
├── schema.sql               # Manual DB setup (optional)
├── .env                     # Your local env vars (git-ignored)
├── .env.example             # Template
├── server.js                # Entry point
├── package.json
└── README.md
```

---

## Prerequisites

- **Node.js** ≥ 18
- **MySQL** ≥ 8 running locally (or a remote host)
- A free [GitHub Personal Access Token](https://github.com/settings/tokens) *(optional but recommended – raises rate limit from 60 to 5 000 req/hr)*

---

## Local Setup

### 1 – Clone & install

```bash
git clone https://github.com/your-name/github-profile-analyzer.git
cd github-profile-analyzer
npm install
```

### 2 – Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=github_analyzer

# Optional – highly recommended
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

### 3 – Database setup

The application **auto-creates** the database and tables when it starts.  
If you prefer to run it manually:

```bash
mysql -u root -p < schema.sql
```

### 4 – Start the server

```bash
# Development (auto-restart on save)
npm run dev

# Production
npm start
```

You should see:

```
✅  Database and tables ready.
🚀  Server running on http://localhost:3000
📖  API docs:  http://localhost:3000/
```

---

## API Endpoints

### `POST /api/profiles/analyze/:username`

Fetches the GitHub profile, computes insights, and upserts to MySQL.

```
POST http://localhost:3000/api/profiles/analyze/octocat
```

**Response 201**
```json
{
  "success": true,
  "message": "Profile for \"octocat\" analysed and saved.",
  "response_time_ms": 312,
  "data": {
    "profile": {
      "id": 1,
      "username": "octocat",
      "name": "The Octocat",
      "bio": null,
      "public_repos": 8,
      "followers": 15000,
      "following": 9,
      "profile_url": "https://github.com/octocat",
      "avatar_url": "https://avatars.githubusercontent.com/u/583231?v=4",
      "repo_follower_ratio": 0.0005,
      "popularity_score": 22504.1,
      "created_at": "2011-01-25 18:44:36",
      "analyzed_at": "2024-03-01 10:00:00"
    },
    "top_repositories": [
      {
        "repo_name": "Hello-World",
        "description": "My first repository on GitHub!",
        "stars": 2500,
        "forks": 1300,
        "language": null,
        "repo_url": "https://github.com/octocat/Hello-World"
      }
    ],
    "insights": {
      "repo_follower_ratio": 0.0005,
      "popularity_score": 22504.1
    }
  }
}
```

---

### `GET /api/profiles`

Returns all analysed profiles from the database.

```
GET http://localhost:3000/api/profiles
```

**Response 200**
```json
{
  "success": true,
  "count": 2,
  "response_time_ms": 5,
  "data": [ { ... }, { ... } ]
}
```

---

### `GET /api/profiles/:username`

Returns a single profile + its top repositories.

```
GET http://localhost:3000/api/profiles/octocat
```

**Response 200** – same shape as the `data` block in the analyze response.

---

### `GET /health`

```json
{ "status": "ok", "service": "github-profile-analyzer", "uptime": 42.3 }
```

---

## Error Reference

| HTTP | Scenario |
|---|---|
| 400 | Invalid GitHub username format |
| 404 | GitHub user not found / not in DB yet |
| 429 | GitHub API rate limit exceeded |
| 502 | GitHub API returned an unexpected error |
| 500 | Database or server error |

---

## Bonus Features

| Feature | Where |
|---|---|
| **Repo-to-Follower Ratio** | `services/githubService.js` → `parseProfileData()` |
| **Popularity Score** | Same function – weighted formula |
| **Top 5 Repos by Stars** | `models/profileModel.js` → `saveTopRepositories()` |
| **Response Time Logging** | Every controller function logs `⏱️ ...ms` |
| **Username Validation** | `controllers/profileController.js` – regex check |

### Popularity Score Formula

```
score = (followers × 1.5) + (public_repos × 0.5) − (following × 0.1)
```

The score is clamped to 0 and rounded to 4 decimal places.

---

## Postman

Import `postman/GitHub_Profile_Analyzer.postman_collection.json` into Postman.  
The collection includes 9 pre-built requests including error cases.

---

## Deployment

### Render.com (free tier)

1. Push the project to GitHub.
2. Go to [render.com](https://render.com) → **New Web Service** → connect your repo.
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Add environment variables in the Render dashboard under **Environment**.
6. For MySQL, create a **New → PostgreSQL** *or* use [PlanetScale](https://planetscale.com) / [Railway](https://railway.app) for MySQL.

### Railway.app (recommended for MySQL)

1. Create a new project → **Deploy from GitHub repo**.
2. Add a **MySQL** plugin – Railway provides `MYSQL_URL` automatically.
3. Set individual `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` from the MySQL plugin's connection info.
4. Add `GITHUB_TOKEN` and `PORT` variables.
5. Railway auto-deploys on every push to `main`.

### Environment variables checklist (production)

```
PORT          – provided by the platform (e.g. Railway injects this)
DB_HOST       – database host
DB_PORT       – database port (usually 3306)
DB_USER       – database username
DB_PASSWORD   – database password
DB_NAME       – github_analyzer
GITHUB_TOKEN  – GitHub personal access token (no extra scopes needed)
```

---

## License

MIT – free to use and modify.
