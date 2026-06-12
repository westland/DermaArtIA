# DermaArtIA v1.70 Release & Installation Guide

This document outlines the upgrade and installation steps to deploy **DermaArtIA v1.70** on your cloud server.

DermaArtIA v1.70 resolves core architectural bugs preventing persistent agent session memory, task delegation to sub-agents (Writer/Coder), and crashes in Watcher system health-checking.

## Key Updates in v1.70

1. **Persistent Session Memory**:
   - Integrated the `x-openclaw-session-key` header in the FastAPI backend (`portal/main.py`). All user portal requests to the gateway are now tied to a persistent session (`portal-henry`).
   - Resolves the bug where a new random UUID session was created on every turn, wiping out Henry's memory and chat history.

2. **Fixed Sub-Agent Handoff / Delegation**:
   - Resolved the `subagent suspended delivery discarded` error. Because the parent session is now persistent, sub-agent completion events (e.g. from `Writer` or `Coder`) are correctly delivered back to Henry's active session history.
   - Updated the `delegate-task` skill (`SKILL.md`) to instruct Henry to use the built-in OpenClaw **`sessions_spawn`** tool instead of executing a non-existent `agent-to-agent` command in the shell.

3. **Resolved Watcher Health Check Crash**:
   - Fixed a Python `NameError` in the Watcher's `health-check` skill script. Initialized the `problems` list at the start of the script, preventing NameError crashes when Nginx or Portal checks encounter warnings or unreachable states.

---

## 1. Pull the Latest Repository Code

Connect to your server via SSH and navigate to your git clone directory (default: `/root/DermaArtIA`). Pull the v1.70 updates:
```bash
cd /root/DermaArtIA
git pull origin main
```

---

## 2. Run the Deployment Script

Deploy the new configs, templates, and agent skills:
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
   su - clawuser -c 'openclaw cron run session-cleanup-hourly'
   ```
3. Check the latest log reports in Watcher's workspace or reports database.

---
*Copyright © 2026 J. Christopher Westland, all rights reserved · v1.70*
