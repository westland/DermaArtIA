# DermaArtIA v1.83 Release & Installation Guide

This document outlines the upgrade and installation steps to deploy **DermaArtIA v1.83** on your cloud server.

DermaArtIA v1.83 merges the Cherry Financing live link integration into the default website workspace configurations, allowing the website to pre-ship with the live Cherry Financing application button active.

## Key Updates in v1.83

1. **Integrated Cherry Financing Button**:
   - Updated `workspace-coder/index.html` template to link directly to `https://withcherry.com/` and removed the placeholder modal trigger.
   - Now, when Coder deploys the website, the Cherry application button is active by default.

---

## 1. Pull the Latest Repository Code

Connect to your server via SSH and navigate to your git clone directory (default: `/root/DermaArtIA`). Pull the v1.83 updates:
```bash
cd /root/DermaArtIA
git pull origin main
```

---

## 2. Run the Quick Deployment Script

Run the quick deployment to upload the new configs and templates:
```bash
python3 /root/DermaArtIA/deploy_quick.py
```

---
*Copyright © 2026 J. Christopher Westland, all rights reserved · v1.83*
