# DermaArtIA v1.50 Release & Installation Guide

This document outlines the upgrade and installation steps to deploy **DermaArtIA v1.50** on your cloud server.

DermaArtIA v1.50 resolves critical cron job execution errors and transitions all messaging pipelines from Discord to the local Reports & Memos portal interface:

1. **Disabled Link Understanding (Fixes News-Digest Cron Failures)**:
   - Configured `"links": { "enabled": false }` in `openclaw.json` to prevent OpenClaw's internal pre-fetching module from resolving Google Search grounding redirect links (which were timing out after 5 seconds and crashing Scout's morning scan).
2. **Rebranded Discord to Reports & Memos**:
   - Replaced `/usr/local/bin/discord-post` helper script with `/usr/local/bin/portal-post`, which publishes markdown reports directly to the Portal API database (`/opt/dermaart-portal/dermaart.db`).
   - Created a symlink `/usr/local/bin/discord-post -> /usr/local/bin/portal-post` to ensure backward compatibility for old session logs and scripts.
   - Renamed the agent skill `discord-report` to `portal-report` and updated instructions in `SKILL.md` to reference the Reports & Memos screen.
   - Updated agent identity configs (`SOUL.md`, `AGENTS.md`) and cron triggers (`jobs.json`) to refer to `portal-report` instead of `discord-report`.
3. **Removed Duplicate Cron Jobs**:
   - Deleted the legacy, duplicate `Nightly Retrospective` job (ID: `1cf6590d-309b-42ac-9558-2df203d6fef7`) which lacked delivery constraints and repeatedly failed due to unconfigured Discord channels.

---

## 1. Pull the Latest Repository Code

Connect to your server via SSH and navigate to your git clone directory (default: `/root/DermaArtIA`). Pull the v1.50 updates:
```bash
cd /root/DermaArtIA
git pull origin main
```

---

## 2. Run the Deployment Script

Deploy the new configs, templates, and agent skills (including the updated Coder workspace template):
```bash
# Make the deployment scripts executable
chmod +x /root/DermaArtIA/deploy/deploy-openclaw.sh

# Run the deployment using your existing API credentials
export NON_INTERACTIVE=1
export SERVER_IP="YOUR_DROPLET_IP"
export GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
export DISCORD_WEBHOOK_URL="http://127.0.0.1:8000/api/reports/submit"
/root/DermaArtIA/deploy/deploy-openclaw.sh
```

---

## 3. Verify Cron Jobs and Reports

1. Verify that all 5 scheduled jobs are enqueued correctly and have the correct delivery status:
   ```bash
   su - clawuser -c 'openclaw cron list'
   ```
2. Verify that there is no duplicate `Nightly Retrospective` job (ID `1cf6590d-309b-42ac-9558-2df203d6fef7`). If it is still present, run:
   ```bash
   su - clawuser -c 'openclaw cron rm 1cf6590d-309b-42ac-9558-2df203d6fef7'
   ```
3. Test a manual execution of Scout's morning scan:
   ```bash
   su - clawuser -c 'openclaw cron run morning-research-daily'
   ```
4. Verify that the output is successfully saved to the portal database and visible on the Reports & Memos screen on your website at: `http://YOUR_SERVER_IP` (Login: `sumar` / `#1DermaArt`).

---
*Copyright © 2026 J. Christopher Westland, all rights reserved · v1.50*
