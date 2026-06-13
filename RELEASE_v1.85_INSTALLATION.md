# DermaArtIA v1.85 Release & Installation Guide

This document outlines the upgrade and installation steps to deploy **DermaArtIA v1.85** on your cloud server.

DermaArtIA v1.85 implements automated task completion reporting for both the Coder and Henry agents, ensuring all completed development and management actions are visible on the Command Center and the "Reports & Memos" section of the FastAPI portal.

## Key Updates in v1.85

1. **Automated Coder Deployment Reports**:
   - Modified Coder's workspace deployment script (`deploy.py`) to automatically submit a formatted Markdown report to the portal's `/api/reports/submit` endpoint upon successful file transfer and Nginx restart.
2. **Mandatory Reporting Instructions**:
   - Updated Coder's `SOUL.md` and `AGENTS.md` to state that publishing a summary of completed work to the Reports & Memos portal section is a strict and mandatory final step for every task.
   - Updated Henry's `SOUL.md` and `AGENTS.md` to make publishing task synthesis and strategy memos mandatory immediately upon completing any management or delegation task.

---

## 1. Pull the Latest Repository Code

Connect to your server via SSH and navigate to your git clone directory (default: `/root/DermaArtIA`). Pull the v1.85 updates:
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
*Copyright © 2026 J. Christopher Westland, all rights reserved · v1.85*
