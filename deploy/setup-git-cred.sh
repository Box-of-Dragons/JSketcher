#!/bin/bash
su - sc-auth -s /bin/bash << 'EOF'
cd ~/htdocs/BetterAuth
git remote set-url origin https://github.com/Box-of-Dragons/BetterAuth.git
git config --local credential.helper store
# Replace <GITHUB_TOKEN> with a valid PAT (repo scope) before running.
echo "https://XanthiaJo:<GITHUB_TOKEN>@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials
git fetch origin master 2>&1
EOF
