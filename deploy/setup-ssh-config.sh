#!/bin/bash
cat > /home/sc-auth/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/deploy_key
  StrictHostKeyChecking no
EOF
chown sc-auth:sc-auth /home/sc-auth/.ssh/config
chmod 600 /home/sc-auth/.ssh/config
