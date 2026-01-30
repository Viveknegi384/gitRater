-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. App Users (Authentication)
CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. GitHub Profiles (Cache for developers being rated)
CREATE TABLE IF NOT EXISTS github_profiles (
    username VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    metrics JSONB, -- Stores { activeRepos, followers, etc. }
    location VARCHAR(255),
    blog VARCHAR(255),
    twitter_username VARCHAR(255),
    company VARCHAR(255),
    email VARCHAR(255),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Ratings (Historical snapshots)
CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) REFERENCES github_profiles(username) ON DELETE CASCADE,
    total_score NUMERIC(5, 2) NOT NULL,
    health_score NUMERIC(5, 2) NOT NULL,
    quality_score NUMERIC(5, 2) NOT NULL,
    breakdown JSONB NOT NULL, -- Full detailed breakdown object
    ai_analysis JSONB, -- { summary, persona, multiplier }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Search History (Personalized dashboard)
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
    searched_profile VARCHAR(255) REFERENCES github_profiles(username) ON DELETE CASCADE,
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_profile UNIQUE(user_id, searched_profile)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ratings_username ON ratings(username);
CREATE INDEX IF NOT EXISTS idx_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_user_profile ON search_history(user_id, searched_profile);
