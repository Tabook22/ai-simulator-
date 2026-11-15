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
sleep 1
systemctl --user is-active neuron-lab
