# Supabase Setup Guide

## Step 1: Create Supabase Project
1. Go to https://supabase.com → Sign in → New Project
2. Project name: `models-link-share`
3. Set a strong DB password (save it!)
4. Region: Choose closest to your users
5. Click "Create new project"

---

## Step 2: Run this SQL in Supabase SQL Editor

Go to: Supabase Dashboard → SQL Editor → New Query → Paste below → Run

```sql
-- ============================================================
-- Models Link Share — Full Schema (PostgreSQL / Supabase)
-- ============================================================

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
    "id"         TEXT        NOT NULL,
    "name"       TEXT        NOT NULL,
    "email"      TEXT        NOT NULL,
    "password"   TEXT        NOT NULL,
    "role"       TEXT        NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- Models table
CREATE TABLE IF NOT EXISTS "models" (
    "id"          TEXT        NOT NULL,
    "user_id"     TEXT        NOT NULL,
    "name"        TEXT        NOT NULL,
    "description" TEXT,
    "file_url"    TEXT,
    "thumbnail"   TEXT,
    "size"        INTEGER,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "models_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "models_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Shares table
CREATE TABLE IF NOT EXISTS "shares" (
    "id"             TEXT        NOT NULL,
    "model_id"       TEXT        NOT NULL,
    "share_token"    TEXT        NOT NULL,
    "password"       TEXT,
    "password_plain" TEXT,
    "expires_at"     TIMESTAMPTZ,
    "max_views"      INTEGER,
    "views"          INTEGER     NOT NULL DEFAULT 0,
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "shares_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shares_model_id_fkey" FOREIGN KEY ("model_id")
        REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "shares_share_token_key" ON "shares"("share_token");

-- Analytics table
CREATE TABLE IF NOT EXISTS "analytics" (
    "id"        TEXT        NOT NULL,
    "share_id"  TEXT        NOT NULL,
    "ip"        TEXT,
    "country"   TEXT,
    "device"    TEXT,
    "browser"   TEXT,
    "viewed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "analytics_share_id_fkey" FOREIGN KEY ("share_id")
        REFERENCES "shares"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Photos table
CREATE TABLE IF NOT EXISTS "photos" (
    "id"         TEXT        NOT NULL,
    "model_id"   TEXT        NOT NULL,
    "file_url"   TEXT        NOT NULL,
    "name"       TEXT        NOT NULL,
    "size"       INTEGER     NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "photos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "photos_model_id_fkey" FOREIGN KEY ("model_id")
        REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Attachments table
CREATE TABLE IF NOT EXISTS "attachments" (
    "id"         TEXT        NOT NULL,
    "model_id"   TEXT        NOT NULL,
    "file_url"   TEXT        NOT NULL,
    "name"       TEXT        NOT NULL,
    "size"       INTEGER     NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attachments_model_id_fkey" FOREIGN KEY ("model_id")
        REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Prisma migrations tracking table (required for prisma migrate deploy)
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    TEXT        NOT NULL,
    "checksum"              TEXT        NOT NULL,
    "finished_at"           TIMESTAMPTZ,
    "migration_name"        TEXT        NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        TIMESTAMPTZ,
    "started_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "applied_steps_count"   INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);
```

---

## Step 3: Get Your DATABASE_URL

In Supabase Dashboard:
1. Go to **Settings** → **Database**
2. Scroll to **Connection string** → Select **URI** tab
3. Copy the URL — it looks like:
   ```
   postgresql://postgres.xxxxxxxxxxxx:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
4. Add `?pgbouncer=true&connection_limit=1` at the end for Render compatibility

Final format:
```
postgresql://postgres.xxxxxxxxxxxx:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

---

## Step 4: Create S3 Bucket (AWS)

Bucket name to use: **`models-link-share-uploads`**

1. Go to AWS Console → S3 → Create Bucket
2. Bucket name: `models-link-share-uploads`
3. Region: Same as your Render backend region (e.g. `ap-south-1` for Mumbai)
4. Uncheck "Block all public access" → Confirm
5. Create bucket

Then go to IAM → Create user → Attach `AmazonS3FullAccess` → Get Access Key + Secret Key

---

## Step 5: Update .env (backend)

```env
PORT=5000
DATABASE_URL="postgresql://postgres.xxxxxxxxxxxx:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
JWT_SECRET="your_strong_random_secret_here"
FRONTEND_URL="https://your-frontend.onrender.com"

# AWS S3 Settings
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=models-link-share-uploads
```
