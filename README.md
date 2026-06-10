# DermaArtIA — Google Gemini-Based Multi-Agent AI Company

**A deployable five-agent autonomous AI company for marketing analytics, research, and automation in the aesthetics sector.**  
*Copyright © 2026 J. Christopher Westland, all rights reserved*

[![Release](https://img.shields.io/badge/release-v1.0-brightgreen)](https://github.com/westland/DermaArtIA/releases/tag/v1.0)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-2026.4.26-blue)](https://openclaw.dev)
[![Platform](https://img.shields.io/badge/platform-Ubuntu%2024.04-orange)](https://ubuntu.com)
[![Interface](https://img.shields.io/badge/interface-FastAPI_Web_Portal-purple)](https://fastapi.tiangolo.com)

> **[The DermaArtIA Manifesto](MANIFESTO.md)** — The course philosophy: Personality, Action Scripts, and Taboos; Druckerian Strategic Realism; and the Zero-Marginal-Cost Agency running entirely on Google Gemini.

---

## What Is DermaArtIA?

DermaArtIA is a multi-agent AI company running 24/7 on a secure cloud server, designed to handle MedSpa and aesthetics marketing operations. Instead of relying on Telegram and Discord, you interact with the agents through a **bespoke, secure Web Portal** featuring:
1. **Interactive Command Center**: Chat with Henry (Chief of Staff) using text or **voice dictation** via browser-native SpeechRecognition.
2. **Mobile Collapsible Sidebar**: Fully responsive mobile/tablet layout with a slide-out drawer menu and stacked dashboards.
3. **Automated Jobs Center**: Live scheduler displaying cron run history, last run statuses (e.g. `ok`, `error`), and a "Run Now" trigger button pulling directly from the active SQLite database.
4. **Integrations & Auth Control Panel**: Securely store credential packages for external platforms (WordPress, Instagram, Facebook, TikTok, Google Business Profile) in the backend SQLite database, and configure fine-grained sharing lists. Credentials are automatically synchronized to permitted agents' workspaces as encrypted/permissioned files, and automatically revoked/wiped when access is turned off.
5. **Reports & Briefings Viewer**: A clean Markdown reader where Scout, Writer, and Watcher submit automated memos and research briefings.
6. **Interactive Media Uploads & Workspace File Manager**: Upload images or videos using a drag-and-drop zone or chat attachments to put assets directly in the agent's workspace.
7. **Social Publishing & Generative AI Hub**: Leverage Google Imagen and Veo to generate and modify photos and videos, and execute Coder scripts to update WordPress pages and publish posts on Instagram, Facebook, and TikTok.

The five agents are:

| Agent | Model | Role |
|-------|-------|------|
| **Henry** | Gemini 2.5 Flash | Chief of Staff — orchestrates the team, delegates tasks |
| **Coder** | Gemini 2.5 Flash | Software Engineer — writes code, compiles homepage styling |
| **Scout** | Gemini 2.5 Flash | Research Analyst — competitor pricing scans and market research |
| **Writer** | Gemini 2.5 Flash | Content Creator — copywriting, distinction blurbs, and memos |
| **Watcher** | Gemini 2.5 Flash | System Monitor — health checks, cleanup, and status logs |

---

## System Architecture

```
                      ┌──────────────────────────────┐
                      │    Sumar Kasik's Browser     │ (Mobile or Desktop)
                      └──────────────┬───────────────┘
                                     │ HTTPS (Port 443 / Port 80)
                                     ▼
                      ┌──────────────────────────────┐
                      │      Nginx Reverse Proxy     │ (Basic Auth + Self-Signed SSL)
                      └──────┬────────────────┬──────┘
                Static Files │                │ API Proxy
                                     ▼                ▼
       ┌──────────────────────────┐    ┌──────────────────────────┐
       │   Frontend Dashboard     │    │   FastAPI Web Portal     │
       │  (Mobile Responsive JS)  │    │      (Port 8000)         │
       └──────────────────────────┘    └──────┬───────────┬───────┘
                                              │           │ SQLite
                                              │ REST API  ▼
                                              │ (18789) ┌─────────────────┐
                                              │         │   Database      │
                                              ▼         │ (dermaart.db)   │
                                       ┌────────────┐   └─────────────────┘
                                       │  OpenClaw  │
                                       │  Gateway   │
                                       └──────┬─────┘
                                              │
                                              ▼
                                   ┌────────────────────┐
                                   │  Google Gemini API │ (Gemini 2.5 Flash)
                                   └────────────────────┘
```

---

## Repository Structure

```
DermaArtIA/
│
├── MANIFESTO.md                     ←  philosophy
├── README.md                        ← This document
├── User_Manual.md                   ← Complete setup and operational guide
│
├── portal/                          ← FastAPI Portal Backend & static Frontend
│   ├── main.py                      ← FastAPI server (port 8000)
│   └── static/                      ← HTML/CSS/JS frontend files
│       ├── index.html               ← Mobile responsive template
│       ├── styles.css               ← Layout design and micro-animations
│       └── app.js                   ← Voice recognition and event handling
│
└── deploy/                          ← Server deployment & configs
    ├── README.md                    ← Quick-start guide
    ├── deploy-openclaw.sh           ← Main installation script (with JIT patch)
    ├── dermaart-portal.service      ← Systemd service unit for portal
    ├── dermaart-portal-nginx.conf   ← Nginx server block template
    ├── openclaw.service             ← Systemd service unit for OpenClaw
    └── configs/
        ├── openclaw.json            ← Gateway configuration (Gemini settings)
        ├── jobs.json                ← Active cron jobs (news-digest, health-check)
        └── workspace-henry/         ← Henry personality files (SOUL, MEMORY)
```

---

## Verification & Troubleshooting

```bash
# Check service status
systemctl status openclaw
systemctl status dermaart-portal
systemctl status nginx

# View live gateway logs
journalctl -u openclaw -f

# View live portal logs
journalctl -u dermaart-portal -f

# Check active cron jobs and next run times
curl -s http://127.0.0.1:8000/api/cron
```

---

*Copyright © 2026 J. Christopher Westland, all rights reserved*
