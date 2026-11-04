#!/usr/bin/env bash
# Pull main, build the API and restart it. Run on the VM: bash deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."

git pull --ff-only
# Only the server workspace; the in-memory MongoDB used by tests must not download
# its binary on the server.
MONGOMS_DISABLE_POSTINSTALL=1 npm ci -w server --include-workspace-root=false
npm run build -w server
sudo systemctl restart taskflow-api
sleep 2
curl -fsS http://127.0.0.1:4000/api/health && echo
