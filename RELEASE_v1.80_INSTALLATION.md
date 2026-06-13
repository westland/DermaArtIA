# DermaArtIA v1.80 Release & Installation Guide

This document outlines the upgrade and installation steps to deploy **DermaArtIA v1.80** on your cloud server.

DermaArtIA v1.80 resolves the `"No response from OpenClaw."` message displayed in the portal UI when an agent initiates background delegation runs. It also optimizes the session database and transcript write locks to prevent timeouts during complex background tasks.

## Key Updates in v1.80

1. **Clean Portal Delegation Confirmations**:
   - Modified `portal/main.py` to intercept empty assistant contents or gateway fallback `"No response from OpenClaw."` responses.
   - Replaces these default outputs with a polite and professional confirmation message indicating that background delegation has been successfully triggered.

2. **Optimized Session Write Lock Timeouts**:
   - Added a top-level `"session"` configuration block with `"writeLock"` settings (`acquireTimeoutMs`: 300000, `maxHoldMs`: 600000) inside `openclaw.json`.
   - Prevent transactions from failing with locks timed out when subagents are running in the background.

---

## 1. Pull the Latest Repository Code

Connect to your server via SSH and navigate to your git clone directory (default: `/root/DermaArtIA`). Pull the v1.80 updates:
```bash
cd /root/DermaArtIA
git pull origin main
```

---

## 2. Run the Quick Deployment Script

Run the quick deployment to upload the new configs, templates, and agent portal fixes:
```bash
# Verify config template openclaw.json contains "session" settings
cat /root/DermaArtIA/deploy/configs/openclaw.json

# Run the quick deploy script
python3 /root/DermaArtIA/deploy_quick.py
```

---

## 3. Restart and Verify Services

1. Restart the OpenClaw agent gateway and the portal API:
   ```bash
   systemctl restart openclaw
   systemctl restart dermaart-portal
   ```
2. Verify that the services are active and running:
   ```bash
   systemctl status openclaw
   systemctl status dermaart-portal
   ```

---
*Copyright © 2026 J. Christopher Westland, all rights reserved · v1.80*
