# DermaArtIA v1.0 Release & Installation Guide

This document outlines the upgrade and installation steps to deploy **DermaArtIA v1.0** on your cloud server. 

DermaArtIA v1.0 introduces a secure **Integrations & Auth Control Panel** in the Admin Portal, localized credentials sharing with strict file system permissions, two new social media publishing tools (`facebook_post.py` and `tiktok_post.py`), a reliable mime-type fix for PNG file uploads, and an automated model fallback gateway failover mechanism to avoid rate limit issues.

---

## 1. Upgrade Prerequisites

Before installing v1.0, ensure you have:
* An active DigitalOcean Droplet (Ubuntu 24.04) running DermaArtIA v0.8.
* SSH access to the droplet as `root`.
* Your Google Gemini API Key and OpenAI API Key (optional).

---

## 2. Pull the Latest Repository Code

Connect to your server via SSH and navigate to your git clone directory (default: `/root/DermaArtIA`). Pull the v1.0 branch or main branch updates:
```bash
cd /root/DermaArtIA
git pull origin main
```

---

## 3. Configure Model Fallback Gateway Settings

To prevent automated jobs (such as the 5-minute health check) from failing due to Google API rate limits (`RESOURCE_EXHAUSTED` / 429), configure a fallback chain in the server's OpenClaw config file:

1. Open `/home/clawuser/.openclaw/openclaw.json` for editing.
2. Locate the `"agents"` configuration block. Under `"defaults" -> "model"`, and under each agent in the `"list"`, change the model string to an object defining fallbacks:
   ```json
   "model": {
     "primary": "google/gemini-2.5-flash",
     "fallbacks": [
       "google/gemini-2.5-flash-lite",
       "google/gemini-3.1-flash-lite"
     ]
   }
   ```
3. Restart the `openclaw` gateway service to apply:
   ```bash
   systemctl restart openclaw
   ```

---

## 4. Run the Deployment Script

Deploy the new code, copy the publishing scripts into all agent workspaces, and update ownership permissions:
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

## 5. Upgrade the FastAPI Web Portal

Sync the new FastAPI backend endpoints and the updated frontend dashboard:

1. Copy the updated portal files to the deployment directory:
   ```bash
   cp -r /root/DermaArtIA/portal/* /opt/dermaart-portal/
   ```
2. Re-install FastAPI dependencies inside the portal's python virtual environment:
   ```bash
   /opt/dermaart-portal/venv/bin/pip install --upgrade fastapi uvicorn psutil pydantic
   ```
3. Restart the portal service to run database migrations (which automatically creates the new `credentials` table in `dermaart.db`):
   ```bash
   systemctl restart dermaart-portal
   ```
4. Verify Nginx is running and restart it:
   ```bash
   nginx -t && systemctl restart nginx
   ```

---

## 6. Configure Integrations & Auth Credentials

1. Navigate to the Admin Portal in your browser: `https://YOUR_DROPLET_IP`.
2. Enter your basic auth credentials (default: `sumar` / `#1DermaArt`).
3. Click the new **Integrations & Auth** item in the slide-out navigation sidebar.
4. Enter credentials for your active platforms:
   * **WordPress**: Base URL, admin username, and application password.
   * **Instagram / Facebook / TikTok**: Page/Client IDs and developer access tokens.
5. In the checklist at the bottom of each integration card, check the agents you wish to grant access to (e.g. `Coder`, `Henry`).
6. Click **Save Credentials**.
   * *The portal saves credentials in SQLite and writes a custom `publishing_credentials.json` directly to the workspaces of selected agents (e.g., `/home/clawuser/.openclaw/workspace-coder/publishing_credentials.json`) with strict `600` owner-only read-write permissions.*

---

## 7. Verification and Test Runs

To test the integration, trigger dry runs of the scripts from the command line:

### WordPress & Instagram Dry Run
```bash
# Run WordPress dry-run to verify connection
su - clawuser -c "python3 ~/.openclaw/workspace-coder/wordpress_update.py --dry-run --title 'Test Post' --content '<p>Hello world</p>'"

# Run Instagram dry-run to verify authentication
su - clawuser -c "python3 ~/.openclaw/workspace-coder/instagram_post.py --dry-run --media-url 'https://site.com/media.jpg' --caption 'Test'"
```

### Facebook Feed Dry Run
```bash
# Post text status
su - clawuser -c "python3 ~/.openclaw/workspace-coder/facebook_post.py --dry-run --caption 'Hello Facebook!'"

# Post image URL
su - clawuser -c "python3 ~/.openclaw/workspace-coder/facebook_post.py --dry-run --media-url 'https://site.com/media.jpg' --caption 'Hello Facebook!'"
```

### TikTok Video Dry Run
```bash
# Post video URL
su - clawuser -c "python3 ~/.openclaw/workspace-coder/tiktok_post.py --dry-run --video-url 'https://site.com/video.mp4' --title 'Test Video'"
```

### Verify Automated Job Statuses
To make sure that health-check and nightly-rnd jobs run cleanly:
```bash
# Trigger nightly R&D job manually
su - clawuser -c "openclaw cron run nightly-rnd-henry"

# Trigger health-check job manually
su - clawuser -c "openclaw cron run health-check-main"
```
Navigate to the **Automated Jobs** tab in the web portal and verify that both runs complete with status `ok` and no errors.

---
*Copyright © 2026 J. Christopher Westland, all rights reserved · v1.0*
