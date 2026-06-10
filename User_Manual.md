# DermaArtIA User Manual: Deploying a Gemini-Based Multi-Agent AI Company

**Deploying OpenClaw and the FastAPI Secure Web Portal on DigitalOcean with Google Gemini 2.5 Flash**  
*Copyright © 2026 J. Christopher Westland, all rights reserved · v1.0*

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
12. [Secure Credentials & Integrations System](#12-secure-credentials--integrations-system)
13. [Gateway Model Fallbacks & Failover](#13-gateway-model-fallbacks--failover)

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

### Agent Memory Indexing (OpenAI 401 Unauthorized Error)
If agents report that their memory search is paused or returns an OpenAI 401 error because of a missing or invalid OpenAI key, it is because OpenClaw defaults to OpenAI for vector embeddings. The system has been reconfigured to run memory search natively on Google Gemini:
1. The `openclaw.json` configuration blocks are configured with `gemini` as the memory search provider, with Google Cloud's async batching disabled to run embeddings inline:
   ```json
   "memorySearch": {
     "provider": "gemini",
     "fallback": "none",
     "remote": {
       "batch": {
         "enabled": false
       }
     }
   }
   ```
2. To trigger a forced rebuild/reindexing of all agent memory databases on the server, run:
   ```bash
   su - clawuser -c "openclaw memory index --force"
   ```
3. To inspect status of agent memory:
   ```bash
   su - clawuser -c "openclaw memory status"
   ```

---

## 11. Multimedia & Social Publishing

The DermaArtIA platform is equipped to generate, modify, and publish images and videos.

### Workspace File Management & Chat Attachments
1. **Chat Attachments**: In the **Command Center**, click the paperclip icon in the message bar to select images or videos to upload. They are uploaded to `/api/media/upload?agent_id=henry` and stored in Henry's workspace.
2. **Workspace Files Tab**: Go to the **Agent Roster** tab, select an agent (e.g. **Coder**), and click **Workspace Files**. You can drag-and-drop images/videos to upload them directly, view listed files, download them, or delete them.
3. **Downloading Agent-Generated Media**: When an agent generates media (such as an image or video), the media is displayed directly in the portal chat. However, the file itself is saved on the server inside `/home/clawuser/.openclaw/media/tool-image-generation/`.
   * To download the file to your computer, instruct Henry: 
     > *"Henry, copy the picture of the two talking bananas to your workspace so I can download it."*
   * Henry's `SOUL.md` directs him to execute a shell command (e.g., `cp /home/clawuser/.openclaw/media/tool-image-generation/image-xxx.jpg ./banana_talking.jpg`) to move it into his workspace folder (`/home/clawuser/.openclaw/workspace-henry/`).
   * Once Henry completes the copy, navigate to the **Agent Roster** tab, click **Henry**, select **Workspace Files**, and you will see the file listed. Click the file name to download it directly to your local computer.

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
The agent workspaces are equipped with pre-packaged automation scripts under `~/.openclaw/workspace-[agent]/`:
1. **`wordpress_update.py`**: Uploads media files and publishes pages or blog posts to WordPress.
2. **`instagram_post.py`**: Publishes photo updates to Instagram Business Accounts via the Instagram Graph API. Note: Instagram strictly requires JPEG (`.jpg`/`.jpeg`) format; agents are instructed to convert PNGs to JPEGs using PIL before posting.
3. **`facebook_post.py`**: Publishes photo, video, or text updates directly to a Facebook Page Feed.
4. **`tiktok_post.py`**: Publishes video posts to TikTok Business Accounts using the TikTok Graph API.

#### Reliability Fix: PNG File Uploads
To prevent upload failures on environments where the operating system fails to guess the correct mime-type for image files (often defaulting to `application/octet-stream` which WordPress rejects), `wordpress_update.py` includes an explicit mime-type override. PNG files (`.png`) are guaranteed to upload with `Content-Type: image/png`, making updates robust and reliable.

---

## 12. Secure Credentials & Integrations System

DermaArtIA v1.0 implements a robust, secure mechanism to store external platform credentials and share them selectively with specific agents (Henry, Coder, Scout, Writer, Watcher).

### Managing Integrations via Web Portal
1. Navigate to the **Integrations & Auth** tab on the side drawer menu.
2. Enter the credential details for the desired service:
   * **WordPress**: Username, App Password, Base URL
   * **Instagram**: Page ID, Access Token
   * **Facebook**: Page ID, Access Token
   * **TikTok**: Client Key, Access Token
   * **Google Business**: Location ID, Access Token
3. Under the **Allowed Agents** checklist for each card, select which agents are authorized to access these credentials.
4. Click **Save Credentials**.

### Secure Workspace Synchronization
* **Database Storage**: All credentials are saved in the portal's `/opt/dermaart-portal/dermaart.db` database inside the `credentials` table. Sensitive inputs (tokens, passwords) are masked (`●●●●●●●●●●`) in the web interface and are preserved when other settings are saved.
* **Workspace Wiping/Syncing**: When credentials are saved, the FastAPI backend automatically writes a localized JSON file named `publishing_credentials.json` directly into the permitted agents' workspaces:
  `/home/clawuser/.openclaw/workspace-[agent_id]/publishing_credentials.json`
* **Security & Permissions**: The credentials file is written with strict UNIX permissions `600` (readable/writable only by the owner) and owned by the `clawuser` user. If an agent's access is unchecked/revoked in the portal, the credentials file is immediately deleted/cleaned from their workspace.
* **Script Integration**: The publishing scripts (`wordpress_update.py`, `instagram_post.py`, etc.) automatically detect and load credentials from `publishing_credentials.json` if command-line API parameters are omitted.

---

## 13. Gateway Model Fallbacks & Failover

To handle API exhaustion errors (`RESOURCE_EXHAUSTED` / HTTP 429) during high-frequency tasks (like the 5-minute health check), OpenClaw v1.0 is configured with an automatic model failover system in `/home/clawuser/.openclaw/openclaw.json`.

### Fallback Chain Configuration
Under both global defaults (`agents.defaults.model`) and individual agent definitions, the primary model is configured alongside a chain of alternative lite models:
```json
"model": {
  "primary": "google/gemini-2.5-flash",
  "fallbacks": [
    "google/gemini-2.5-flash-lite",
    "google/gemini-3.1-flash-lite"
  ]
}
```

### How Failover Operates
1. If an agent executes a turn and the primary model (`google/gemini-2.5-flash`) fails with a rate limit error (429), OpenClaw catches the exception.
2. It automatically shifts execution to the next fallback candidate (`google/gemini-2.5-flash-lite`).
3. If that candidate fails or times out, it moves to `google/gemini-3.1-flash-lite`.
4. When a fallback succeeds, the session completes cleanly, updating the cron job database status to `ok` and logging the recovery events in `/home/clawuser/.openclaw/logs/openclaw.log`.

---
*Copyright © 2026 J. Christopher Westland, all rights reserved · v1.0*


