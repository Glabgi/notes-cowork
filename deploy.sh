#!/bin/bash
# Notes Cowork — one-shot deploy helper
# Usage: ./deploy.sh
set -e

echo "→ 1/3 Pushing code to GitHub..."
echo ""
echo "Сначала создай пустой репо на github.com/new (БЕЗ readme/gitignore)"
echo "Затем введи URL репозитория (формат: git@github.com:user/repo.git или https://...)"
read -p "Repo URL: " REPO

git branch -M main 2>/dev/null || true
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO"
git push -u origin main

echo ""
echo "→ 2/3 Deploy на Vercel..."
echo ""
if ! command -v vercel &> /dev/null; then
  echo "Устанавливаю Vercel CLI..."
  npm i -g vercel
fi
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_SOCKET_URL production
vercel --prod

echo ""
echo "→ 3/3 Готово! Открой https://vercel.com → твой проект"
echo "  Не забудь Socket.io: railway.app → deploy этого же репо → start: npm run start:socket"
