# DermaArtIA v1.86 Release & Installation Guide

This document outlines the upgrade and installation steps to deploy **DermaArtIA v1.86** on your cloud server.

DermaArtIA v1.86 resolves redundant cron scheduler tasks by removing the duplicate and broken custom "Nightly R&D Session" jobs that failed due to unconfigured announcement channels. It also renames the built-in, working `nightly-rnd` task to `"Nightly R&D Session"` in all configurations to provide a user-friendly display in the portal UI, while maintaining the correct portal-report delivery mechanism.

## Key Updates in v1.86

1. **Cron Job Cleanup**:
   - Removed duplicate custom `Nightly R&D Session` jobs (`4347567b-1e36-4c4d-bd80-63aa6a7e82cf` and `75908146-cb10-4ae5-b46c-805f7a9ef43f`) which were throwing errors because they attempted to use the `announce` delivery mode without any configured chat channels (Discord/Telegram).
2. **Cron Renaming**:
   - Renamed the official working `nightly-rnd` job (ID: `nightly-rnd-henry`) to **`"Nightly R&D Session"`** in configurations and the SQLite database.
   - This ensures the UI displays the job with the correct, user-friendly name while keeping its delivery mode set to `none` (meaning it successfully writes strategies directly to the portal's Reports dashboard using the `portal-report` skill).

---

## 1. Pull the Latest Repository Code

Connect to your server via SSH and navigate to your git clone directory (default: `/root/DermaArtIA`). Pull the v1.86 updates:
```bash
cd /root/DermaArtIA
git pull origin main
```

---

## 2. Run the Quick Deployment Script

Run the quick deployment to upload the new configs and templates, and apply the updated instructions to the agents' active workspaces:
```bash
python3 /root/DermaArtIA/deploy_quick.py
```

---
*Copyright © 2026 J. Christopher Westland, all rights reserved · v1.86*
