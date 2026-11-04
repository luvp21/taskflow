#!/usr/bin/env bash
# One-time setup on the VM (Ubuntu, Node 22, nginx, certbot already installed).
# Run from the cloned repo: bash deploy/setup.sh
# Then create /etc/taskflow-api.env (see deploy/README.md) and run deploy/update.sh.
set -euo pipefail
cd "$(dirname "$0")"

sudo cp taskflow-api.service /etc/systemd/system/taskflow-api.service
sudo cp nginx-taskflow-api.conf /etc/nginx/sites-available/taskflow-api
sudo ln -sf /etc/nginx/sites-available/taskflow-api /etc/nginx/sites-enabled/taskflow-api
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl daemon-reload
sudo systemctl enable taskflow-api
sudo certbot --nginx -d taskflow-api.140-245-11-73.sslip.io --non-interactive --redirect
