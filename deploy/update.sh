#!/usr/bin/env bash
# Update the deployed /simulator/ app after a git push. Run as nasser:
#   bash /home/nasser/apps/neuron-lab/deploy/update.sh
set -euo pipefail

APP=/home/nasser/apps/neuron-lab
cd "$APP"

git pull --ff-only
.venv/bin/pip install -r backend/requirements.txt
cd frontend
npm ci
VITE_BASE=/simulator/ npm run build
systemctl --user restart neuron-lab

# Wait for the new process to answer before reporting success. This avoids a
# short nginx 502 window immediately after a restart.
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8030/api/presets/one-neuron >/dev/null 2>&1; then
    echo "Neuron Lab is healthy."
    exit 0
  fi
  sleep 1
done

echo "Neuron Lab did not become healthy after 30 seconds." >&2
systemctl --user status neuron-lab --no-pager -l >&2 || true
journalctl --user -u neuron-lab -n 40 --no-pager >&2 || true
exit 1

