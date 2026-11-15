#!/usr/bin/env bash
# Install the /simulator/ nginx routes. Run as root:
#   sudo bash /home/nasser/apps/neuron-lab/deploy/install-nginx.sh
set -euo pipefail

CONFIG=/etc/nginx/sites-available/nasserdiary.conf
SNIPPET=/home/nasser/apps/neuron-lab/deploy/nginx-simulator.conf

if [[ ! -f "$CONFIG" ]]; then
  echo "nginx config not found: $CONFIG" >&2
  exit 1
fi
if [[ ! -f "$SNIPPET" ]]; then
  echo "snippet not found: $SNIPPET" >&2
  exit 1
fi

if grep -q 'NEURON LAB' "$CONFIG"; then
  echo "Neuron Lab nginx block is already installed."
else
  backup="${CONFIG}.bak.$(date +%Y%m%d-%H%M%S)"
  cp "$CONFIG" "$backup"
  echo "Backed up nginx config to $backup"

  python3 - "$CONFIG" "$SNIPPET" <<'PY'
import sys
from pathlib import Path

config_path, snippet_path = map(Path, sys.argv[1:3])
text = config_path.read_text(encoding="utf-8")
snippet = snippet_path.read_text(encoding="utf-8").strip()

anchor = "    location / {\n"
if anchor not in text:
    raise SystemExit("Could not find the 'location / {' anchor in nginx config.")

text = text.replace(anchor, snippet + "\n\n" + anchor, 1)
config_path.write_text(text, encoding="utf-8")
PY

  if ! nginx -t; then
    echo "nginx validation failed; restoring backup" >&2
    cp "$backup" "$CONFIG"
    nginx -t || true
    exit 1
  fi
fi

systemctl reload nginx
echo "Neuron Lab is available at https://nasserdiary.com/simulator/"
