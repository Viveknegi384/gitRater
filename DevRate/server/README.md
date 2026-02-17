# DevRate Server 🚀

A comprehensive GitHub developer rating and analysis API that evaluates developers based on their GitHub activity, PR quality, commit patterns, and AI-powered insights.

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [AI Integration](#ai-integration)
- [Scoring Algorithm](#scoring-algorithm)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)

---

## Overview

DevRate Server is a Node.js + TypeScript backend service that analyzes GitHub developers and provides:
- **Developer Impact Score** (0-100) with tier classification (Legendary, Elite, Senior, Mid-Level, Junior)
- **AI-Powered Analysis** using Google Gemini for PR quality assessment and developer persona identification
- **Bulk Analysis** for processing multiple candidates via Excel uploads
- **Job Fit Scoring** to match developers against job descriptions
- **Profile Caching** with 24-hour refresh mechanism to optimize API usage

---

## Architecture

### High-Level Flow
```
Client Request → Express Routes → Authentication Middleware → Controllers → Services → Database/GitHub API/AI
                                                                  ↓
                                                          Response with Score & Analysis
```

### Core Components
1. **Controllers**: Handle HTTP requests and responses
2. **Services**: Business logic for GitHub data fetching, scoring, and AI analysis
3. **Middleware**: Authentication (JWT) and file upload handling (Multer)
4. **Database**: PostgreSQL with comprehensive schema for users, profiles, ratings, and bulk analysis

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | Node.js |
| **Language** | TypeScript |
| **Framework** | Express.js v5 |
| **Database** | PostgreSQL |
| **Authentication** | JWT (jsonwebtoken) + bcrypt |
| **GitHub API** | Octokit v5 |
| **AI Model** | Google Gemini 2.5 Flash |
| **Rate Limiting** | express-rate-limit |
| **File Processing** | xlsx, multer |
| **Logging** | Winston with daily log rotation |

---

## Features

### 🔐 Authentication
- User signup and login with JWT tokens (7-day expiry)
- Password hashing with bcrypt (10 salt rounds)
- Token validation middleware with database user existence check

### 👤 Developer Rating
- Real-time GitHub profile analysis
- 24-hour caching mechanism to reduce API calls
- Comprehensive metrics: commits, PRs, issues, stars, followers
- AI-enhanced scoring with developer persona identification

### 📊 Bulk Analysis
- Upload Excel files with GitHub URLs
- Sequential processing to respect rate limits
- Job description matching for recruitment use cases
- Session-based tracking with database persistence
- Export-ready results with DevRate scores and job fit analysis

### 🔍 Profile Management
- User-specific search history
- Profile deletion with cascading cleanup
- Latest rating retrieval for cached profiles

### 🤖 AI Integration
- **PR Quality Analysis**: Reviews PR descriptions, review comments, and code changes
- **Commit Quality Scoring**: Evaluates commit message patterns (0-15 scale)
- **Developer Persona**: Assigns archetypes (Architect, Bug Slayer, Performance Wizard, etc.)
- **Engineering Multiplier**: 0.8-1.2x based on contribution quality
- **Job Fit Scoring**: Optional 0-100 match score when job description provided

---

## Database Schema

### Core Tables

#### `app_users`
User authentication and profile information.
```sql
- id (UUID, PK)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- name (VARCHAR)
- created_at (TIMESTAMP)
```

#### `github_profiles`
Cached GitHub developer data.
```sql
- username (VARCHAR, PK)
- name, avatar_url, bio, location, blog, twitter_username, company, email
- metrics (JSONB) - Contains: followers, public_repos, total_commits, total_stars, 
                              merged_prs, pr_acceptance_rate, issues_closed, language_breadth
- last_updated (TIMESTAMP) - For 24-hour cache invalidation
```

#### `ratings`
Historical snapshots of developer scores.
```sql
- id (SERIAL, PK)
- username (FK → github_profiles)
- total_score, health_score, quality_score (NUMERIC)
- breakdown (JSONB) - Full scoring details
- ai_analysis (JSONB) - AI results: {multiplier, persona, summary, commitScore, job_fit_score, match_reason}
- created_at (TIMESTAMP)
```

#### `search_history`
User's personalized search dashboard.
```sql
- id (SERIAL, PK)
- user_id (FK → app_users)
- searched_profile (FK → github_profiles)
- searched_at (TIMESTAMP)
- UNIQUE(user_id, searched_profile)
```

#### `bulk_analysis_sessions`
Bulk upload tracking.
```sql
- id (SERIAL, PK)
- user_id (FK → app_users)
- session_name (VARCHAR)
- total_profiles (INTEGER)
- created_at (TIMESTAMP)
```

#### `bulk_analysis_profiles`
Individual results from bulk analysis.
```sql
- id (SERIAL, PK)
- session_id (FK → bulk_analysis_sessions)
- candidate_name, github_url, github_username
- devrate_tier, quality_score, job_fit_score, match_reason
- error_message (for failed analyses)
- profile_data (JSONB) - Complete row data from Excel
- created_at (TIMESTAMP)
```

### Indexes
Optimized for performance:
- `idx_ratings_username`, `idx_ratings_created_at`
- `idx_history_user_id`, `idx_search_history_user_profile`
- `idx_bulk_sessions_user_id`, `idx_bulk_profiles_session_id`

---

## API Endpoints

### Authentication (`/api/auth`)

#### `POST /api/auth/signup`
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Validation:**
- Password minimum 8 characters
- Email uniqueness enforced

---

#### `POST /api/auth/login`
Authenticate existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** Same as signup

**Error Codes:**
- `401`: Invalid credentials
- `400`: Missing email/password

---

### Developer Rating (`/api/rating`)

#### `GET /api/rating/:username`
Get comprehensive developer rating and analysis.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile rating calculated and saved successfully",
  "cached": false,
  "data": {
    "username": "octocat",
    "name": "The Octocat",
    "avatar_url": "https://avatars.githubusercontent.com/u/583231",
    "bio": "GitHub mascot",
    "location": "San Francisco",
    "email": null,
    "blog": "https://github.blog",
    "twitter_username": "GitHub",
    "company": "@github",
    "followers": 5000,
    "public_repos": 8,
    "total_commits": 1250,
    "total_stars": 200,
    "merged_prs": 45,
    "pr_acceptance_rate": 90.5,
    "issues_closed": 30,
    "language_breadth": 5,
    "developer_impact_score": 87,
    "tier": "Elite",
    "score_breakdown": {
      "health_score": 18.5,
      "quality_score": 68.3,
      "ai_score": 13
    },
    "ai_analysis": {
      "summary": "Highly engaged contributor with thorough PR reviews and clear commit messages.",
      "persona": "The Code Reviewer"
    }
  }
}
```

**Caching Behavior:**
- If profile was fetched within 24 hours: Returns cached data (`cached: true`)
- Otherwise: Fetches fresh data from GitHub API

**Error Codes:**
- `404`: GitHub user not found
- `429`: GitHub API rate limit exceeded
- `500`: Internal server error

---

### Bulk Analysis (`/api/bulk-rate`)

#### `POST /api/bulk-rate`
Upload Excel file with GitHub URLs for batch analysis.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**
- `file`: Excel file (.xls, .xlsx) with a column containing GitHub URLs
- `sessionName`: (optional) Custom name for this analysis session
- `jobDescription`: (optional) Job description for fit scoring

**Excel Format:**
Any column containing "GitHub" (case-insensitive) or values with "github.com/" will be detected.

Example:
```
| Name | GitHub Link | Experience |
|------|-------------|------------|
| John | https://github.com/john | 5 years |
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 10 profiles.",
  "sessionId": 42,
  "data": [
    {
      "Name": "John",
      "GitHub Link": "https://github.com/john",
      "Experience": "5 years",
      "devRate_score": "Elite",
      "devRate_total": 82.5,
      "job_fit_score": 85,
      "match_reason": "Strong backend experience with relevant tech stack"
    }
  ],
  "errors": [
    {"username": "invaliduser", "error": "GitHub user not found"}
  ]
}
```

**Processing:**
- Sequential (rate-limit safe)
- Auto-detects GitHub URL column
- Saves session and results to database

---

#### `GET /api/bulk-sessions`
Retrieve all bulk analysis sessions for authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "session_name": "Q1 2026 Candidates",
      "total_profiles": 10,
      "created_at": "2026-02-15T10:30:00Z"
    }
  ]
}
```

---

#### `GET /api/bulk-sessions/:sessionId`
Get detailed results for a specific session.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": 42,
    "user_id": "uuid",
    "session_name": "Q1 2026 Candidates",
    "total_profiles": 10,
    "created_at": "2026-02-15T10:30:00Z"
  },
  "profiles": [
    {
      "id": 1,
      "session_id": 42,
      "candidate_name": "John Doe",
      "github_url": "https://github.com/john",
      "github_username": "john",
      "devrate_tier": "Elite",
      "quality_score": 82.5,
      "job_fit_score": 85,
      "match_reason": "Strong match for backend role",
      "error_message": null,
      "profile_data": {...},
      "created_at": "2026-02-15T10:35:00Z"
    }
  ]
}
```

---

### Profile Management (`/api/profiles`)

#### `GET /api/profiles`
Get user's search history with latest ratings.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "searched_profile": "octocat",
    "searched_at": "2026-02-15T10:00:00Z",
    "name": "The Octocat",
    "avatar_url": "https://avatars.githubusercontent.com/u/583231",
    "bio": "GitHub mascot",
    "location": "San Francisco",
    "company": "@github",
    "blog": "https://github.blog",
    "twitter_username": "GitHub",
    "email": null,
    "metrics": {...},
    "total_score": 87,
    "health_score": 18.5,
    "quality_score": 68.3,
    "ai_analysis": {...}
  }
]
```

---

#### `DELETE /api/profiles/:username`
Delete a GitHub profile from the system (cascades to ratings and search history).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Profile deleted successfully"
}
```

**Cascade Behavior:**
- Deletes from `github_profiles`
- Auto-removes related `ratings` (FK ON DELETE CASCADE)
- Auto-removes related `search_history` entries

---

## AI Integration

### Provider: Google Gemini 2.5 Flash

### Analysis Process

1. **Data Collection**
   - Top 5 merged PRs (prioritizing engagement via comments)
   - PR descriptions, review comments, code change stats
   - Last 20 commit messages

2. **Prompt Engineering**
   The AI evaluates:
   - **Engineering Quality Multiplier** (0.8-1.2):
     - 1.2 = Exceptional: Large impactful PRs with thorough reviews
     - 1.0 = Average: Standard contributions
     - 0.8 = Amateur: Trivial changes
   
   - **Commit Quality Score** (0-15):
     - 13-15: Excellent - Follows conventions (feat:, fix:), atomic commits
     - 10-12: Good - Mostly clear
     - 7-9: Average - Basic descriptions
     - 0-6: Poor/Meaningless
   
   - **Developer Persona** (8 archetypes):
     - The Architect (system designer)
     - The Bug Slayer (critical fixes)
     - The Performance Wizard (optimization)
     - The Full-Stack Virtuoso (versatile)
     - The Open Source Champion (community)
     - The Code Reviewer (thorough)
     - The Feature Builder (shipping)
     - The Pragmatist (gets things done)
   
   - **Job Fit Analysis** (if job description provided):
     - `job_fit_score`: 0-100 (90-100 = Perfect, 0-39 = Poor)
     - `match_reason`: 1-2 sentence explanation

3. **Output Format (JSON)**
   ```json
   {
     "multiplier": 1.15,
     "persona": "The Code Reviewer",
     "summary": "Thorough contributor with clean PRs and atomic commits.",
     "commitScore": 13,
     "job_fit_score": 85,
     "match_reason": "Strong backend skills matching required stack"
   }
   ```

4. **Fallback Handling**
   - Missing API key → Default neutral score (1.0x multiplier)
   - API errors → Graceful degradation with "The Pragmatist" persona
   - Invalid JSON → Caught and logged, uses defaults

---

## Scoring Algorithm

### Components

#### A. Profile Health (20 points max)
```
1. Followers (5 pts):    logScale(followers, 1000) × 0.05
2. Organizations (5 pts): min(orgCount, 5)
3. Commit Volume (10 pts): logScale(totalCommits, 10000) × 0.10
```

#### B. Engineering Quality (80 points max)
```
1. Acceptance Rate (35 pts): (mergedPRs / closedPRs) × 35
2. Impact/Stars (35 pts):    logScale(totalStars, 5000) × 35
3. Issues Solved (15 pts):   logScale(closedIssues, 50) × 15
4. Commit Quality (15 pts):  AI Score (0-15)
```

#### Final Calculation
```
Base Score = Health (20) + Quality (80)
Final Score = min(round(Base × AI_Multiplier), 100)
```

### Tier Classification
```
90-100: Legendary
75-89:  Elite
60-74:  Senior
40-59:  Mid-Level
0-39:   Junior
```

### Logarithmic Scaling
Prevents runaway numbers from dominating scores:
```typescript
logScale(value, maxExpected) = min((log10(value) / log10(maxExpected)) × 100, 100)
```
Example: 1000 commits → log10(1000)/log10(10000) = 3/4 = 75% of max

---

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 13+
- GitHub Personal Access Token ([Create one](https://github.com/settings/tokens))
- Google Gemini API Key ([Get one](https://ai.google.dev/))

### Installation

1. **Clone and Navigate**
   ```bash
   cd server
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Setup Environment Variables**
   Create `.env` file (see [Environment Variables](#environment-variables))

4. **Database Setup**
   ```bash
   # Create database
   npm run db:create
   
   # Run migrations (creates tables)
   npm run db:migrate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```
   Server runs on `http://localhost:3000`

6. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

---

## Environment Variables

Create a `.env` file in the `server/` directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret (Generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-here

# GitHub API Token (Create at: https://github.com/settings/tokens)
# Required scopes: public_repo, read:user
GITHUB_TOKEN=ghp_your_github_personal_access_token

# Google Gemini API Key (Get at: https://ai.google.dev/)
GEMINI_API_KEY=your-gemini-api-key-here

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=devrate
DB_USER=postgres
DB_PASSWORD=your-db-password
DB_SSL=false  # Set to 'true' for production with SSL
```

### Security Notes
- **Never commit `.env`** to version control
- Use strong JWT_SECRET (minimum 32 characters)
- Rotate API keys regularly
- Enable `DB_SSL=true` in production

---

## Project Structure

```
server/
├── src/
│   ├── index.ts                  # Express app entry point
│   ├── types.ts                  # TypeScript interfaces
│   │
│   ├── config/
│   │   └── env.ts                # Environment validation
│   │
│   ├── constants/
│   │   └── scoring.ts            # Tier thresholds, weights
│   │
│   ├── controllers/
│   │   ├── authController.ts     # Signup, login
│   │   ├── ratingController.ts   # Get developer rating
│   │   ├── bulkController.ts     # Bulk upload, sessions
│   │   └── profileController.ts  # Search history, delete
│   │
│   ├── db/
│   │   ├── index.ts              # PostgreSQL pool
│   │   ├── schema.sql            # Database schema
│   │   ├── create_db.ts          # DB creation script
│   │   └── migrate.ts            # Migration runner
│   │
│   ├── middleware/
│   │   ├── auth.ts               # JWT authentication
│   │   └── upload.ts             # Multer file upload
│   │
│   ├── routes/
│   │   └── index.ts              # API route definitions
│   │
│   ├── services/
│   │   ├── ai.ts                 # Google Gemini integration
│   │   ├── github.ts             # GitHub API calls (Octokit)
│   │   ├── scoring.ts            # Score calculation logic
│   │   ├── ratingService.ts      # Orchestrates rating flow
│   │   └── database.ts           # DB helper functions
│   │
│   └── utils/
│       └── logger.ts             # Winston logger
│
├── logs/                          # Auto-generated logs
├── package.json
├── tsconfig.json
└── README.md                      # This file
```

---

## Key Features Explained

### 24-Hour Caching
- **Purpose**: Reduce GitHub API calls (rate limit: 5000/hour)
- **Mechanism**: `last_updated` timestamp in `github_profiles`
- **Behavior**: 
  - If `last_updated` > 24 hours ago → Fetch fresh data
  - Otherwise → Return cached rating from database

### Rate Limiting
- **Global**: 100 requests per 15 minutes per IP
- **Endpoints**: Applied to all `/api/*` routes
- **Library**: `express-rate-limit`

### Logging
- **Library**: Winston with `winston-daily-rotate-file`
- **Levels**: error, warn, info, debug
- **Storage**: `logs/` directory (daily rotation)
- **Console**: Colored output in development

### Error Handling
- Graceful GitHub API error responses (404, 429, 403)
- Database transaction safety
- AI service fallbacks
- Detailed error logging

---

## API Rate Limits

### GitHub API
- **Authenticated**: 5000 requests/hour
- **Unauthenticated**: 60 requests/hour
- **Search API**: 30 requests/minute
- **Mitigation**: 24-hour caching, sequential bulk processing

### Google Gemini
- **Free Tier**: 15 requests/minute, 1500/day
- **Paid Tier**: Higher limits
- **Handling**: Graceful fallback on errors

---

## Development Scripts

```bash
# Development with auto-reload
npm run dev

# Build TypeScript
npm run build

# Production mode
npm start

# Database management
npm run db:create   # Create database
npm run db:migrate  # Run schema migrations
```

---

## Production Considerations

1. **Environment Variables**: Use secure secret management (AWS Secrets Manager, Vault)
2. **Database**: Enable SSL (`DB_SSL=true`), use connection pooling
3. **CORS**: Restrict origins to production domains
4. **Rate Limiting**: Adjust `windowMs` and `max` per environment
5. **Logging**: Ship logs to centralized service (CloudWatch, Datadog)
6. **Error Monitoring**: Integrate Sentry or similar
7. **API Keys**: Rotate regularly, use least-privilege scopes

---

## Common Issues & Solutions

### GitHub API Rate Limit
**Error**: `429 Too Many Requests`
**Solution**: 
- Wait for rate limit reset (check `retry-after` header)
- Use authenticated token with higher limits
- Leverage 24-hour caching

### Database Connection Fails
**Error**: `Connection refused`
**Solution**:
- Verify PostgreSQL is running: `pg_isready`
- Check `DB_HOST`, `DB_PORT`, `DB_NAME` in `.env`
- Ensure database exists: `npm run db:create`

### AI Analysis Returns Defaults
**Symptom**: All scores have 1.0x multiplier, "The Pragmatist" persona
**Solution**:
- Verify `GEMINI_API_KEY` in `.env`
- Check API quota: https://ai.google.dev/
- Review logs for specific error messages

---

## Contributing

1. Follow TypeScript strict mode
2. Use Winston logger (not `console.log`)
3. Add error handling for all async operations
4. Write descriptive commit messages
5. Update this README for new features

---

## License

MIT License - See LICENSE file for details

---

## Support

For issues, feature requests, or questions:
- GitHub Issues: [Repository Link]
- Email: [Contact Email]

---

**Built with ❤️ for better developer assessment**
