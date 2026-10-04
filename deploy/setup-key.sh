#!/bin/bash
su - sc-auth -s /bin/bash << 'EOF'
ssh-keygen -t ed25519 -C "VPS deploy key" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
EOF
