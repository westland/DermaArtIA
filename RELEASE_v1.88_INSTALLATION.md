# DermaArtIA v1.88 Patch Release & Installation Guide

This document outlines the upgrade and installation steps to deploy **DermaArtIA v1.88** on your cloud server.

DermaArtIA v1.88 is a maintenance and integration release that tracks local deployment scripts inside the repository with dynamic paths and includes the health check false-alarm fixes.

## Key Updates in v1.88

1. **Integration of Local Deployment Scripts**:
   - Integrated `deploy_quick.py` and `deploy.py` directly into the repository root so they are version-controlled and packaged.
   - Updated local base path resolution to be fully dynamic. The scripts resolve their relative paths correctly whether run from the workspace root or inside the `DermaArtIA/` subdirectory.
   - Hardened `deploy_quick.py` to use a JSON merge configuration logic on the server, ensuring active Gemini/OpenAI API keys in `openclaw.json` are not overwritten with placeholders during updates.

2. **Watcher Health Check Fixes (from v1.87)**:
   - Corrected the OpenClaw service status check from querying a user-level service (`systemctl --user is-active openclaw-gateway.service`) to checking the system-level service (`systemctl is-active openclaw.service`).
   - Replaced `urllib.request` checks with robust `curl` status code checks in watcher's health-check skill.
   - Expanded the accepted HTTP status codes list to include `301` (redirect to HTTPS) and `404` (Nginx default response on port 80 for `127.0.0.1`).

---

## 1. Pull the Latest Repository Code

Connect to your server via SSH and navigate to your git clone directory (default: `/root/DermaArtIA`). Pull the v1.88 updates:
```bash
cd /root/DermaArtIA
git pull origin main
```

---

## 2. Run the Deployment Script

You can deploy configs, templates, and agent skills directly using the integrated `deploy_quick.py` script from your local machine, or run the server-side deployment script:
```bash
# Make the deployment scripts executable
chmod +x /root/DermaArtIA/deploy/deploy-openclaw.sh

# Run the deployment using your existing API credentials
export NON_INTERACTIVE=1
export SERVER_IP="YOUR_DROPLET_IP"
export GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
export PORTAL_REPORTS_URL="http://127.0.0.1:8000/api/reports/submit"
export DISCORD_WEBHOOK_URL="http://127.0.0.1:8000/api/reports/submit"
/root/DermaArtIA/deploy/deploy-openclaw.sh
```

---

## 3. Restart and Verify Services

1. Restart the OpenClaw agent gateway and the portal API:
   ```bash
   systemctl restart openclaw
   systemctl restart dermaart-portal
   ```
2. Verify that the scheduled jobs run successfully without errors:
   ```bash
   su - clawuser -c 'openclaw cron run health-check-main'
   ```
3. Check the latest log reports in Watcher's workspace or reports database.

---
*Copyright © 2026 J. Christopher Westland, all rights reserved · v1.88*
