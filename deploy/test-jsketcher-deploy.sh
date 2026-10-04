#!/bin/bash
su - sc-jsketcher -s /bin/bash << 'EOF'
source ~/.nvm/nvm.sh
cd ~/htdocs/repo
echo "=== git fetch ==="
git fetch origin main 2>&1
echo "=== git reset ==="
git reset --hard origin/main 2>&1
echo "=== npm ci ==="
npm ci 2>&1 | tail -3
echo "=== gen changelog md ==="
node scripts/generate-changelog.mjs --root=. --format=md --output=docs/changelog.md 2>&1
echo "=== gen changelog html ==="
node scripts/generate-changelog.mjs --root=. --format=html --output=web/changelog-fragment.html 2>&1
echo "=== grunt ==="
npx grunt 2>&1 | tail -10
echo "=== done ==="
EOF
