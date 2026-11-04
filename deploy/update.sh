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
# The API listens only after it has connected to MongoDB, which takes a few seconds.
for _ in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:4000/api/health; then echo; exit 0; fi
  sleep 1
done
echo 'API did not become healthy; see: journalctl -u taskflow-api -n 50' >&2
exit 1
