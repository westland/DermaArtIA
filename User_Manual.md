# DermaArtIA User Manual: Deploying a Gemini-Based Multi-Agent AI Company

**Deploying OpenClaw and the FastAPI Secure Web Portal on DigitalOcean with Google Gemini 2.5 Flash**  
*Copyright © J. Christopher Westland · v0.5*

---

> **What you will build:** A secure, mobile-friendly command center and automated scheduler for 5 specialized AI agents (Henry, Coder, Scout, Writer, Watcher) running entirely on Google Gemini. You control them by typing or speaking (via voice recognition), and they autonomously perform competitor research, generate reports, write copy, and monitor systems, saving everything to a local reports database.

---

## Table of Contents

1. [Create Your DigitalOcean Droplet](#1-create-your-digitalocean-droplet)
2. [Get Your API Keys](#2-get-your-api-keys)
3. [Clone and Organize Your Files](#3-clone-and-organize-your-files)
4. [Deploy the OpenClaw Gateway](#4-deploy-the-openclaw-gateway)
5. [Configure the FastAPI Web Portal](#5-configure-the-fastapi-web-portal)
6. [Configure Nginx SSL & Basic Authentication](#6-configure-nginx-ssl--basic-authentication)
7. [Verify and Run Your First Command](#7-verify-and-run-your-first-command)
8. [Automating Tasks (Cron Jobs)](#8-automating-tasks-cron-jobs)
9. [Bypassing SSL Warnings on Mobile](#9-bypassing-ssl-warnings-on-mobile)
10. [Troubleshooting](#10-troubleshooting)
11. [Multimedia & Social Publishing](#11-multimedia--social-publishing)

---

## 1. Create Your DigitalOcean Droplet

### Create a Droplet
1. Go to [digitalocean.com](https://www.digitalocean.com) and create an account.
2. Click **Create → Droplets** and choose these settings:
   * **Image**: Ubuntu 24.04 (LTS) x64
   * **Size**: Basic → Regular → **$6/mo** (1 GB RAM, 1 vCPU, 25 GB disk)
   * **Authentication**: Password — set a strong root password
   * **Hostname**: `DermaArtIA`
3. Wait for it to boot and copy the **IP address** of the droplet.

### Connect via SSH
Open a terminal and connect:
```bash
ssh root@YOUR_DROPLET_IP
```

---

## 2. Get Your API Keys

1. **Google Gemini API Key (Required)**:
   * Go to [Google AI Studio](https://aistudio.google.com/) and sign in.
   * Click **Get API Key** and create a key.
   * Copy the key (starts with `AIzaSy...`).
2. **OpenAI API Key (Optional)**:
   * Only needed if you plan to enable server-side voice note transcription. (The portal's microphone button runs locally in the browser and does not require this key).

---

## 3. Clone and Organize Your Files

Clone the repository to `/root/DermaArtIA` on your server:
```bash
git clone https://github.com/westland/DermaArtIA /root/DermaArtIA
```

---

## 4. Deploy the OpenClaw Gateway

1. Make the deployment script executable:
   ```bash
   chmod +x /root/DermaArtIA/deploy/deploy-openclaw.sh
   ```
2. Run the installer:
   ```bash
   export NON_INTERACTIVE=1
   export SERVER_IP="YOUR_DROPLET_IP"
   export GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
   export DISCORD_WEBHOOK_URL="http://127.0.0.1:8000/api/reports/submit"
   /root/DermaArtIA/deploy/deploy-openclaw.sh
   ```
   *Note: This script installs Node.js, compiles OpenClaw, configures workspaces, and applies a custom JIT patch to the `@google/genai` library on the server to expand model execution timeouts from 30s to 5 minutes.*

---

## 5. Configure the FastAPI Web Portal

1. Install system dependencies:
   ```bash
   apt-get install -y python3-pip python3-venv apache2-utils nginx
   ```
2. Set up the virtual environment:
   ```bash
   mkdir -p /opt/dermaart-portal
   cp -r /root/DermaArtIA/portal/* /opt/dermaart-portal/
   python3 -m venv /opt/dermaart-portal/venv
   /opt/dermaart-portal/venv/bin/pip install fastapi uvicorn psutil
   ```
3. Enable and start the systemd service:
   ```bash
   cp /root/DermaArtIA/deploy/dermaart-portal.service /etc/systemd/system/
   systemctl daemon-reload
   systemctl enable dermaart-portal
   systemctl start dermaart-portal
   ```

---

## 6. Configure Nginx SSL & Basic Authentication

1. **Create Basic Auth User**:
   Choose a username (e.g. `sumar`) and password:
   ```bash
   htpasswd -b -c /etc/nginx/.htpasswd sumar '#1DermaArt'
   ```
2. **Generate Self-Signed SSL Certificate**:
   This enables the browser to recognize the site as a **Secure Context**, enabling microphone permissions for voice typing:
   ```bash
   openssl req -x509 -nodes -days 365 -newkey rsa:2048      -keyout /etc/ssl/private/nginx-selfsigned.key      -out /etc/ssl/certs/nginx-selfsigned.crt      -subj "/C=US/ST=Arizona/L=Scottsdale/O=Derma Art MedSpa/CN=YOUR_DROPLET_IP"
   ```
3. **Configure Nginx Site Block**:
   ```bash
   cp /root/DermaArtIA/deploy/dermaart-portal-nginx.conf /etc/nginx/sites-available/dermaart-portal
   # Replace YOUR_SERVER_IP inside the config with your droplet IP
   sed -i "s/YOUR_SERVER_IP/YOUR_DROPLET_IP/g" /etc/nginx/sites-available/dermaart-portal
   ln -sf /etc/nginx/sites-available/dermaart-portal /etc/nginx/sites-enabled/
   rm -f /etc/nginx/sites-enabled/default
   ```
4. **Open Port 443 in Firewall and Restart**:
   ```bash
   ufw allow 443/tcp
   ufw reload
   nginx -t && systemctl restart nginx
   ```

---

## 7. Verify and Run Your First Command

Open your browser and navigate to `http://YOUR_DROPLET_IP` or `https://YOUR_DROPLET_IP`.
1. Enter your Basic Auth credentials.
2. In the **Command Center**, type or click the microphone to speak a command to Henry. E.g.:
   > *"Henry, ask Writer to draft a new 'Direct Access' distinction section copy for the home page."*
3. You will see Henry decompose the task, spawn Writer, and return the drafted copy in the chat log.

---

## 8. Automating Tasks (Cron Jobs)

Automated operations are managed in `/home/clawuser/.openclaw/state/openclaw.sqlite` and configured in `/home/clawuser/.openclaw/cron/jobs.json`.
* **Health Check** (`health-check-main`): Runs every 5 minutes.
* **Competitor Scan** (`morning-research-daily`): Scout searches the web for Scottsdale competitor prices at 8:00 AM daily.
* **Memo Writing** (`daily-memo-writer`): Writer turns Scout's scan into an operational memo at 9:00 AM daily.

Go to the **Automated Jobs** tab on the web portal to view run history, next execution times, or click **"Run Now"** to trigger them on-demand.

---

## 9. Bypassing SSL Warnings on Mobile

Because we use a raw IP address, your browser will display a privacy warning on the first load:
* **Safari (iOS)**: Tap **Show Details → visit this website** and confirm with FaceID/passcode.
* **Chrome (Android/Desktop)**: Click **Advanced → Proceed to IP (unsafe)**.

Once bypassed, the mic button and layouts will be fully functional.

---

## 10. Troubleshooting

### Portal Service Status
```bash
systemctl status dermaart-portal
journalctl -u dermaart-portal -n 40 --no-pager
```

### Config Validation
```bash
su - clawuser -c "openclaw config validate"
```

---

## 11. Multimedia & Social Publishing

The DermaArtIA platform is equipped to generate, modify, and publish images and videos.

### Workspace File Management & Chat Attachments
1. **Chat Attachments**: In the **Command Center**, click the paperclip icon in the message bar to select images or videos to upload. They are uploaded to `/api/media/upload?agent_id=henry` and stored in Henry's workspace.
2. **Workspace Files Tab**: Go to the **Agent Roster** tab, select an agent (e.g. **Coder**), and click **Workspace Files**. You can drag-and-drop images/videos to upload them directly, view listed files, download them, or delete them.

### Generative AI (Imagen & Veo) CLI Commands
The agent system is configured with Google's image and video generation APIs:
* **Image Generation (Imagen)**:
  ```bash
  su - clawuser -c 'openclaw infer image generate --prompt "A minimalist silhouette of a lavender plant" --output ~/.openclaw/workspace-coder/lavender.jpg'
  ```
* **Video Generation (Veo)**:
  ```bash
  su - clawuser -c 'openclaw infer video generate --prompt "A close up of orchids blowing in the wind" --output ~/.openclaw/workspace-coder/orchids.mp4'
  ```
* **Image Editing (Imagen Edit)**:
  ```bash
  su - clawuser -c 'openclaw infer image edit --file ~/.openclaw/workspace-coder/lavender.jpg --prompt "make the background sunset colors" --output ~/.openclaw/workspace-coder/lavender_sunset.jpg'
  ```

### Automating Social Updates
Coder has access to two pre-packaged scripts inside the workspace:
1. **`wordpress_update.py`**: Interacts with your WordPress site to upload media files and inject page/post HTML copy.
2. **`instagram_post.py`**: Interacts with the Instagram Graph API to post media (via the public link returned by the WordPress script).

