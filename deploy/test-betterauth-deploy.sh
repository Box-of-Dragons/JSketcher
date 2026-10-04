#!/bin/bash
su - sc-auth -s /bin/bash << 'EOF'
source ~/.nvm/nvm.sh
cd ~/htdocs/BetterAuth
echo "=== git fetch ==="
git fetch origin master 2>&1
echo "=== git reset ==="
git reset --hard origin/master 2>&1
echo "=== npm ci ==="
npm ci 2>&1 | tail -5
echo "=== auth migrate ==="
npx auth migrate --y 2>&1 | tail -10
echo "=== npm run build ==="
npm run build 2>&1 | tail -10
echo "=== pm2 reload ==="
pm2 reload better-auth-app 2>&1
echo "=== done ==="
EOF
