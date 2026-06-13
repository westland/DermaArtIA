# DermaArtIA v1.81 Release & Installation Guide

This document outlines the upgrade and installation steps to deploy **DermaArtIA v1.81** on your cloud server.

DermaArtIA v1.81 integrates the live Square booking portal directly into the public website booking buttons, removes the placeholder trigger overlays for these buttons, and fixes a directory resolution bug inside the Coder workspace deployment script.

## Key Updates in v1.81

1. **Live Square Booking Integration**:
   - Updated the header navigation "Book Now" button, the hero section "Book a Consultation" button, and Section One "Online Booking Portal" button to direct to the live Square portal: `https://square.site/appointments/book/EC5R46S63KXZB/derma-art-medspa-scottsdale-az`.
   - Removed the `.placeholder-trigger` class from these booking buttons so they immediately direct to the live booking URL instead of prompting the placeholder modal.
   - Preserved `.placeholder-trigger` for financing links ("Apply via Cherry" and "Apply via CareCredit") as they still require integration configurations.

2. **Fixed Coder Workspace Deployment Script**:
   - Modified `deploy.py` in the root and in the Coder workspace configuration template (`deploy/configs/workspace-coder/deploy.py`) to resolve directories dynamically using `os.path.dirname(os.path.abspath(__file__))`.
   - This fixes the issue where the deployment script was using a hardcoded Windows path, preventing the Linux server from uploading files to the production website directory.

3. **Synchronized Workspace Configuration Templates**:
   - Updated `deploy_quick.py` to upload configurations from the MedSpa-specific repository `DermaArtIA` instead of `ClawInc`.

---

## 1. Pull the Latest Repository Code

Connect to your server via SSH and navigate to your git clone directory (default: `/root/DermaArtIA`). Pull the v1.81 updates:
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

## 3. Verify Local Workspace Deployments

Once the quick deployment completes, Coder can execute website updates safely:
1. Trigger Coder to run the dynamic `deploy.py` script.
2. The corrected script will locate the local workspace files `/home/clawuser/.openclaw/workspace-coder/index.html`, `style.css`, and `app.js` and upload them to `/var/www/dermaartmedspa` on the production website droplet (`157.230.221.89`).

---
*Copyright © 2026 J. Christopher Westland, all rights reserved · v1.81*
