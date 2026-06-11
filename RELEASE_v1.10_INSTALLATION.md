# DermaArtIA v1.10 Release & Installation Guide

This document outlines the upgrade and installation steps to deploy **DermaArtIA v1.10** on your cloud server.

DermaArtIA v1.10 introduces bug fixes and security configuration updates that resolve critical agent execution issues, including Henry's SSH lockout warning and nightly retrospective failures:
1. **Henry Subagent allowedAgents Update:** Added `watcher` and `henry` to `subagents.allowAgents` in `openclaw.json` to allow Henry (Chief of Staff) to delegate diagnostics to Watcher.
2. **Elevated Execution Mode Gating:** Enabled `tools.elevated.enabled` globally in `openclaw.json` to authorize Watcher to query local resources (e.g., memory, disk usage, systemctl statuses) directly on the host VPS.
3. **Linux Workspace Path Resolution:** Fixed hardcoded Windows path references in Henry's `rnd-meeting` skill (`SKILL.md`) to point to the correct Linux server paths (`/home/clawuser/.openclaw/...`), preventing file read failures.
4. **Concurrent Sessions Expansion:** Increased `maxConcurrentSessions` from `2` to `5` to prevent gateway session blocks when running multiple subagents in parallel.
5. **Cron State Clean Reset:** Removed legacy double-scheduled Telegram cron jobs and reset SQLite cron schedules cleanly via `openclaw doctor --fix`.

---

## 1. Pull the Latest Repository Code

Connect to your server via SSH and navigate to your git clone directory (default: `/root/DermaArtIA`). Pull the v1.10 updates:
```bash
cd /root/DermaArtIA
git pull origin main
```

---

## 2. Config Updates in openclaw.json

To apply the configuration changes manually or verify your configuration, ensure `/home/clawuser/.openclaw/openclaw.json` has the following blocks:

1. **Max Sessions & Allowed Subagents:**
   ```json
   "acp": {
     "enabled": true,
     "allowedAgents": [
       "henry",
       "coder",
       "scout",
       "writer",
       "watcher"
     ],
     "maxConcurrentSessions": 5
   },
   "agents": {
     "defaults": {
       "subagents": {
         "allowAgents": [
           "scout",
           "writer",
           "coder",
           "watcher",
           "henry"
         ],
         "maxSpawnDepth": 1
       }
     }
   }
   ```

2. **Elevated Gating:**
   ```json
   "tools": {
     "exec": {
       "security": "full",
       "ask": "off"
     },
     "elevated": {
       "enabled": true
     }
   }
   ```

Restart the OpenClaw service after making any changes:
```bash
systemctl restart openclaw
```

---

## 3. Run the Deployment Script

Deploy the new configs, templates, and agent skills:
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

## 4. Reset & Sync Cron Schedules

Because legacy cron scheduler schedules might persist in SQLite, clean the database state and re-import:
```bash
# Stop OpenClaw service
systemctl stop openclaw

# Wipe persistent SQLite state database (recreated on startup)
rm -f /home/clawuser/.openclaw/state/openclaw.sqlite*

# Restart OpenClaw
systemctl start openclaw

# Wait 10 seconds for service boot, then import clean schedule
su - clawuser -c "openclaw doctor --fix"

# Restart to apply configuration
systemctl restart openclaw
```

---

## 5. Verification and Test Runs

Verify that the enqueued health-check and retrospective jobs run without error:

```bash
# Verify active cron list
su - clawuser -c "openclaw cron list"

# Trigger health check manually to verify elevated local diagnostics
su - clawuser -c "openclaw cron run health-check-main"

# Trigger nightly R&D retrospective manually to check subagent coordination
su - clawuser -c "openclaw cron run nightly-rnd-henry"
```
Verify that all manual runs complete with status `ok` and compile successfully.

---
*Copyright © 2026 J. Christopher Westland, all rights reserved · v1.10*
