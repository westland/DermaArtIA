# DermaArtIA v1.84 Release & Installation Guide

This document outlines the upgrade and installation steps to deploy **DermaArtIA v1.84** on your cloud server.

DermaArtIA v1.84 integrates the CareCredit Financing live link integration into the default website workspace configurations, allowing the website to pre-ship with both the Cherry and CareCredit patient financing buttons active.

## Key Updates in v1.84

1. **Integrated CareCredit Financing Button**:
   - Updated `workspace-coder/index.html` template to link directly to `https://www.carecredit.com/` and removed the placeholder modal trigger.
   - Now, when Coder deploys the website, the CareCredit application button is active by default.

---

## 1. Pull the Latest Repository Code

Connect to your server via SSH and navigate to your git clone directory (default: `/root/DermaArtIA`). Pull the v1.84 updates:
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
*Copyright © 2026 J. Christopher Westland, all rights reserved · v1.84*
