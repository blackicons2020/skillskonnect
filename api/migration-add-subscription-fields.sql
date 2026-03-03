-- Migration: Add subscription_date and subscription_amount columns to users table
-- Date: 2024
-- Description: These columns are needed to track when subscriptions were activated and how much was paid

-- Add subscription_date column (stores when subscription was activated/approved)
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_date TIMESTAMP;

-- Add subscription_amount column (stores the amount paid for subscription in NGN)
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_amount INTEGER;

-- Optional: Update existing users with subscription_tier to set their subscription_date if not set
-- (You can run this if you want to backfill data)
-- UPDATE users SET subscription_date = NOW() WHERE subscription_tier IS NOT NULL AND subscription_tier != 'Free' AND subscription_date IS NULL;
