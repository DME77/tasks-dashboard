#!/bin/bash
# Run this once from Terminal to fix stale git locks and push to Vercel
set -e
cd "$(dirname "$0")"

echo "→ Removing stale git locks..."
rm -f .git/index.lock .git/HEAD.lock

echo "→ Resetting bad local commit (files stay intact)..."
git reset HEAD~

echo "→ Staging all changes..."
git add -A

echo "→ Committing..."
git commit -m "feat: Google OAuth, logout button, whitelist sheet"

echo "→ Pushing to GitHub → Vercel will auto-deploy..."
git push

echo "✅ Done! Check Vercel for deployment status."
