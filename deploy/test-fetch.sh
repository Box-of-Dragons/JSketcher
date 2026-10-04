#!/bin/bash
su - sc-auth -s /bin/bash << 'EOF'
cd ~/htdocs/BetterAuth
GIT_SSH_COMMAND="ssh -v" git fetch origin master 2>&1 | tail -30
EOF
