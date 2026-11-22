# Neuron Lab deployment

Live URL: **https://nasserdiary.com/simulator/**

## Layout on the VPS

| Piece | Location |
| --- | --- |
| Git clone | `/home/nasser/apps/neuron-lab` |
| Python environment | `/home/nasser/apps/neuron-lab/.venv` |
| Built frontend | `/home/nasser/apps/neuron-lab/frontend/dist` |
| Backend | `127.0.0.1:8030` |
| User service | `~/.config/systemd/user/neuron-lab.service` |
| nginx routes | `/etc/nginx/sites-available/nasserdiary.conf` |
| nginx backup | `nasserdiary.conf.bak.YYYYMMDD-HHMMSS` |

## Update after pushing to GitHub

```bash
bash /home/nasser/apps/neuron-lab/deploy/update.sh
```

The script pulls, reinstalls Python dependencies, rebuilds the frontend with
`VITE_BASE=/simulator/`, and restarts the user service.

### Site search index

The search box (top bar, Ctrl K) reads `frontend/public/search-index.en.json` and
`search-index.ar.json`. They are built on a development machine, not on the VPS,
because building them opens every page in a browser. After changing any content,
rebuild them before committing:

```bash
cd frontend
npm run build
NEURON_LAB_BROWSER=chrome npm run search-index
```

The test `the search index is up to date` in `frontend/tests/search.spec.ts` fails
when a heading on any page is missing from the index.

## Service commands

```bash
systemctl --user status neuron-lab
systemctl --user restart neuron-lab
journalctl --user -u neuron-lab -n 80 --no-pager
```

The account has lingering enabled, so the user service starts at boot.

## nginx

The routes are installed by:

```bash
sudo bash /home/nasser/apps/neuron-lab/deploy/install-nginx.sh
```

The script backs up the existing site config, inserts the `/simulator/` block,
runs `nginx -t`, and reloads nginx. It is safe to rerun; it detects the
`NEURON LAB` marker and skips insertion.

## Architecture

- `https://nasserdiary.com/simulator/` — static Vite build
- `https://nasserdiary.com/simulator/api/*` — proxied to `127.0.0.1:8030/api/*`
- `https://nasserdiary.com/` — the existing OpenClaw dashboard, unchanged
