# DermaArtIA v1.82 Release & Installation Guide

This document outlines the upgrade and installation steps to deploy **DermaArtIA v1.82** on your cloud server.

DermaArtIA v1.82 fixes path confusion and timeout errors that occurred when the Henry agent attempted to delegate website updates to the Coder agent. It injects an explicit "Website Code Management & Deployment Protocol" into both Henry's and Coder's operating manuals (`AGENTS.md`).

## Key Updates in v1.82

1. **Explicit Website Path & Handoff Prompts**:
   - Updated `workspace-coder/AGENTS.md` to instruct Coder to always edit the website files (`index.html`, `style.css`, `app.js`) locally in its workspace `/home/clawuser/.openclaw/workspace-coder/` instead of fetching them from the production server.
   - Updated `workspace-henry/AGENTS.md` to instruct Henry to delegate website edits specifically with local workspace paths and local `deploy.py` execution instructions.
   - This prevents Coder from attempting to fetch files from `/var/www/html/` on the production server (which caused permission denied blocks and portal timeouts).

2. **Established SSH Keys for Clawuser**:
   - An SSH key pair has been established for the `clawuser` on the gateway server (`174.138.46.163`) and authorized on the production server (`157.230.221.89`). This allows passwordless command execution and file transfer.

---

## 1. Pull the Latest Repository Code

Connect to your server via SSH and navigate to your git clone directory (default: `/root/DermaArtIA`). Pull the v1.82 updates:
```bash
cd /root/DermaArtIA
git pull origin main
```

---

## 2. Run the Quick Deployment Script

Run the quick deployment to upload the new configs, templates, and agent workspace fixes:
```bash
# Run the quick deploy script
python3 /root/DermaArtIA/deploy_quick.py
```

---

## 3. Verify Server Upgrades

1. Trigger Henry via the portal with a command to edit a website link or text.
2. Henry will now delegate to Coder with instructions to modify files locally in `workspace-coder` and execute the local `deploy.py` script.
3. The script will successfully upload the edited files to the production web directory `/var/www/dermaartmedspa` on droplet `157.230.221.89` passwordlessly.

---
*Copyright © 2026 J. Christopher Westland, all rights reserved · v1.82*
