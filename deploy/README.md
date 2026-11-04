# Deploying the API to a VM

The API runs on an Oracle Cloud VM (Ubuntu 24.04, Node 22) as a systemd service
behind nginx, which terminates HTTPS with a Let's Encrypt certificate. The hostname
comes from [sslip.io](https://sslip.io), which resolves `*.140-245-11-73.sslip.io` to
that IP, so no DNS record is needed.

| File | Purpose |
|---|---|
| `taskflow-api.service` | systemd unit: `node dist/index.js` in `server/`, restarts on failure |
| `nginx-taskflow-api.conf` | proxies `taskflow-api.140-245-11-73.sslip.io` to `127.0.0.1:4000` |
| `setup.sh` | one time: installs the unit and the site, issues the certificate |
| `update.sh` | every deploy: `git pull`, install server deps, build, restart, health check |

## First time

```bash
git clone https://github.com/luvp21/taskflow.git ~/taskflow
cd ~/taskflow
sudo install -m 600 /dev/null /etc/taskflow-api.env
sudo nano /etc/taskflow-api.env      # see below
bash deploy/setup.sh
bash deploy/update.sh
```

`/etc/taskflow-api.env` (root-only, never committed):

```
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://USER:PASS@HOST/taskflow?retryWrites=true&w=majority
CORS_ORIGIN=https://<the Vercel URL>
CHAOS_ENABLED=true
```

## Later deploys

```bash
cd ~/taskflow && bash deploy/update.sh
```

Logs: `journalctl -u taskflow-api -f`.
