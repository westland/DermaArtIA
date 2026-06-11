# DermaArtIA v1.20 Release & Installation Guide

This document outlines the upgrade and installation steps to deploy **DermaArtIA v1.20** on your cloud server.

DermaArtIA v1.20 introduces website recovery, secure HTTPS configurations, and agent workspace setup to support collaborative editing:
1. **Original Website Restoration**: Deployed the original premium multi-section landing page back to the production server `157.230.221.89` under HTTPS (port 443) using a self-signed SSL certificate with IP Subject Alternative Name (SAN).
2. **Preserved Backup**: Kept a copy of the old website files archived at `/var/www/backups/dermaartmedspa_backup_1781191503.tar.gz` (and locally under `backups/`) for safety.
3. **Agent Workspace Synchronization**: Populated Coder's workspace at `/home/clawuser/.openclaw/workspace-coder/` with the original website's main files (`index.html`, `style.css`, `app.js`) and the complete `assets/` directory.
4. **On-Demand Linux Deployment Tools**: Created a Linux-compatible `/home/clawuser/.openclaw/workspace-coder/deploy.py` script so that Coder and Henry can automatically push modifications to the production server.
5. **System Dependencies**: Added `python3-paramiko` package installation during system bootstrap inside `deploy-openclaw.sh` to support the SSH-based deployment process.

---

## 1. Pull the Latest Repository Code

Connect to your server via SSH and navigate to your git clone directory (default: `/root/DermaArtIA`). Pull the v1.20 updates:
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

## 3. Verify Agent Website Deployments

To verify Coder can successfully modify and deploy changes on demand:
```bash
# Execute deploy script from Coder workspace manually
su - clawuser -c 'python3 /home/clawuser/.openclaw/workspace-coder/deploy.py'
```
The output should end with `Deployment successfully completed from Coder's workspace!`.

---

## 4. HTTPS and SSL Verification

Verify the restored site responds correctly over secure port 443:
```bash
curl -k -I https://157.230.221.89
```

Expected HTTP Header output:
```http
HTTP/2 200 
server: nginx/1.24.0 (Ubuntu)
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-frame-options: DENY
x-content-type-options: nosniff
x-xss-protection: 1; mode=block
```

---
*Copyright © 2026 J. Christopher Westland, all rights reserved · v1.20*
