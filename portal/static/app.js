// --- Global State ---
let currentTab = "tab-command";
let agentsData = [];
let selectedReportId = null;

// --- DOM elements ---
const pageTitle = document.getElementById("page-title");
const pageDesc = document.getElementById("page-desc");

// --- Tab Navigation Setup ---
document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        const targetTab = button.getAttribute("data-tab");
        
        // Update nav items
        document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        
        // Update tab panes
        document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.remove("active"));
        document.getElementById(targetTab).classList.add("active");
        
        currentTab = targetTab;
        
        // Header title updates
        updateHeaderInfo(targetTab);
        
        if (targetTab === "tab-credentials") {
            loadCredentials();
        }

        // Auto-close sidebar overlay on mobile when switching tabs
        document.querySelector(".app-container").classList.remove("sidebar-active");
    });
});

function updateHeaderInfo(tabId) {
    switch(tabId) {
        case "tab-command":
            pageTitle.innerText = "Command Center";
            pageDesc.innerText = "Issue requests and direct tasks to your Chief of Staff, Henry.";
            break;
        case "tab-roster":
            pageTitle.innerText = "Agent Roster";
            pageDesc.innerText = "Details and workspace configurations of your 5 AI specialists.";
            break;
        case "tab-cron":
            pageTitle.innerText = "Automated Jobs";
            pageDesc.innerText = "Monitor automated cron schedules and trigger them on-demand.";
            break;
        case "tab-reports":
            pageTitle.innerText = "Reports & Memos";
            pageDesc.innerText = "Review generated research briefings, operational memos, and health logs.";
            break;
        case "tab-system":
            pageTitle.innerText = "System Status";
            pageDesc.innerText = "Hardware resources and process health metrics of your server.";
            break;
        case "tab-credentials":
            pageTitle.innerText = "Integrations & Auth";
            pageDesc.innerText = "Configure and manage credentials shared with specific AI agents.";
            break;
    }
}

// --- Quick Statistics & System Polling ---
async function pollSystemStats() {
    try {
        const res = await fetch("/api/system");
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        
        // Update Gateway status badge
        const gwBadge = document.getElementById("gateway-status-badge");
        if (data.gateway_active) {
            gwBadge.className = "badge badge-active";
            gwBadge.innerText = "ACTIVE";
        } else {
            gwBadge.className = "badge badge-inactive";
            gwBadge.innerText = "INACTIVE";
        }
        
        // Update metrics if available
        if (data.metrics && !data.metrics.error) {
            const m = data.metrics;
            document.getElementById("quick-cpu").innerText = `${m.cpu_pct}%`;
            document.getElementById("quick-ram").innerText = `${m.ram_used} / ${m.ram_total} GB`;
            
            // If on the System tab, update rings and table
            if (currentTab === "tab-system") {
                updateProgressRing("cpu-ring", m.cpu_pct);
                document.getElementById("sys-cpu-val").innerText = `${m.cpu_pct}%`;
                
                updateProgressRing("ram-ring", m.ram_pct);
                document.getElementById("sys-ram-val").innerText = `${m.ram_pct}%`;
                document.getElementById("sys-ram-details").innerText = `${m.ram_used} / ${m.ram_total} GB used`;
                
                updateProgressRing("disk-ring", m.disk_pct);
                document.getElementById("sys-disk-val").innerText = `${m.disk_pct}%`;
                document.getElementById("sys-disk-details").innerText = `${m.disk_used} / ${m.disk_total} GB used`;
                
                if (data.process) {
                    document.getElementById("sys-proc-pid").innerText = data.process.pid;
                    document.getElementById("sys-proc-uptime").innerText = data.process.uptime;
                    document.getElementById("sys-proc-mem").innerText = `${data.process.mem_mb} MB`;
                } else {
                    document.getElementById("sys-proc-pid").innerText = "Not running";
                    document.getElementById("sys-proc-uptime").innerText = "—";
                    document.getElementById("sys-proc-mem").innerText = "—";
                }
            }
        }
    } catch (e) {
        console.error("System poll failed", e);
    }
}

function updateProgressRing(id, pct) {
    const ring = document.getElementById(id);
    if (!ring) return;
    const radius = ring.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    ring.style.strokeDasharray = `${circumference} ${circumference}`;
    const offset = circumference - (pct / 100) * circumference;
    ring.style.strokeDashoffset = offset;
}

// --- Command Console & Chat & Attachments ---
const commandForm = document.getElementById("command-form");
const commandInput = document.getElementById("command-input");
const commandLog = document.getElementById("command-log");
const submitBtn = document.getElementById("command-submit-btn");

let selectedChatFiles = [];
const chatAttachmentBtn = document.getElementById("chat-attachment-btn");
const chatFileInput = document.getElementById("chat-file-input");
const chatAttachmentsPreview = document.getElementById("chat-attachments-preview");

if (chatAttachmentBtn && chatFileInput) {
    chatAttachmentBtn.addEventListener("click", () => {
        chatFileInput.click();
    });

    chatFileInput.addEventListener("change", () => {
        for (let file of chatFileInput.files) {
            if (!selectedChatFiles.some(f => f.name === file.name && f.size === file.size)) {
                selectedChatFiles.push(file);
            }
        }
        renderChatAttachments();
        chatFileInput.value = "";
    });
}

function renderChatAttachments() {
    if (!chatAttachmentsPreview) return;
    if (selectedChatFiles.length === 0) {
        chatAttachmentsPreview.style.display = "none";
        chatAttachmentsPreview.innerHTML = "";
        return;
    }

    chatAttachmentsPreview.style.display = "flex";
    chatAttachmentsPreview.innerHTML = "";

    selectedChatFiles.forEach((file, index) => {
        const isVideo = file.type.startsWith("video/") || file.name.endsWith(".mp4") || file.name.endsWith(".mov") || file.name.endsWith(".avi");
        const div = document.createElement("div");
        div.className = `attachment-preview-item ${isVideo ? "video-type" : "image-type"}`;
        div.innerHTML = `
            <span>${escapeHTML(file.name)}</span>
            <span class="attachment-remove-btn" onclick="removeChatAttachment(${index})"><i class="fa-solid fa-xmark"></i></span>
        `;
        chatAttachmentsPreview.appendChild(div);
    });
}

window.removeChatAttachment = function(index) {
    selectedChatFiles.splice(index, 1);
    renderChatAttachments();
};

// Handle command submit
commandForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    let prompt = commandInput.value.trim();
    if (!prompt) return;
    
    // Clear input
    commandInput.value = "";
    
    // Add user bubble to log
    appendMessage("user", prompt);
    
    // Disable inputs and add loader bubble
    commandInput.disabled = true;
    submitBtn.disabled = true;
    const loaderId = appendLoader("Processing attachments & thinking...");
    
    try {
        let uploadedNames = [];
        if (selectedChatFiles.length > 0) {
            for (let file of selectedChatFiles) {
                const formData = new FormData();
                formData.append("file", file);
                
                const uploadRes = await fetch(`/api/media/upload?agent_id=henry`, {
                    method: "POST",
                    body: formData
                });
                
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    uploadedNames.push(uploadData.filename);
                } else {
                    appendMessage("system", `Upload failed for file: ${file.name}`);
                }
            }
            
            if (uploadedNames.length > 0) {
                prompt += `\n\n[Attached workspace files: ${uploadedNames.join(", ")}]`;
            }
            
            selectedChatFiles = [];
            renderChatAttachments();
        }

        const res = await fetch("/api/commands", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agent_id: "henry", prompt: prompt })
        });
        
        removeLoader(loaderId);
        
        if (!res.ok) {
            const err = await res.json();
            appendMessage("system", `Error: ${err.detail || "Request failed"}`);
        } else {
            const data = await res.json();
            appendMessage("henry", data.response);
            loadReports();
        }
    } catch (err) {
        removeLoader(loaderId);
        appendMessage("system", `Portal Error: ${err.message}`);
    } finally {
        commandInput.disabled = false;
        submitBtn.disabled = false;
        commandInput.focus();
    }
});

// Shortcut buttons
document.querySelectorAll(".btn-shortcut").forEach(btn => {
    btn.addEventListener("click", () => {
        const prompt = btn.getAttribute("data-prompt");
        commandInput.value = prompt;
        commandInput.focus();
    });
});

function appendMessage(sender, text) {
    const div = document.createElement("div");
    const timestamp = new Date().toLocaleTimeString();
    
    if (sender === "user") {
        div.className = "user-message-bubble";
        div.innerHTML = `<span class="msg-time">${timestamp}</span>${escapeHTML(text)}`;
    } else if (sender === "system") {
        div.className = "system-message";
        div.innerHTML = `<span class="msg-time">${timestamp}</span> ${escapeHTML(text)}`;
    } else {
        // Agent message
        div.className = "agent-message-bubble";
        
        // Parse any MEDIA:<path> tags and render them inline
        let mediaHtml = "";
        let cleanText = text.replace(/^MEDIA:(.+)$/gm, (match, path) => {
            const trimmedPath = path.trim();
            const isVideo = trimmedPath.endsWith(".mp4") || trimmedPath.endsWith(".mov") || trimmedPath.endsWith(".avi") || trimmedPath.endsWith(".webm");
            let mediaUrl = "";
            if (trimmedPath.startsWith("/home/clawuser/.openclaw/media/")) {
                mediaUrl = `/api/media/generated?filepath=${encodeURIComponent(trimmedPath)}`;
            } else if (trimmedPath.startsWith("/") || trimmedPath.startsWith("C:")) {
                mediaUrl = `/api/media/generated?filepath=${encodeURIComponent(trimmedPath)}`;
            } else if (trimmedPath.startsWith("http://") || trimmedPath.startsWith("https://")) {
                mediaUrl = trimmedPath;
            } else {
                mediaUrl = `/api/media/download?agent_id=${sender}&filename=${encodeURIComponent(trimmedPath)}`;
            }
            
            if (isVideo) {
                mediaHtml += `<div class="msg-media-container" style="margin-top: 10px; max-width: 100%;"><video src="${mediaUrl}" controls style="max-width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);"></video></div>`;
            } else {
                mediaHtml += `<div class="msg-media-container" style="margin-top: 10px; max-width: 100%;"><img src="${mediaUrl}" alt="Generated media" style="max-width: 100%; max-height: 400px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);" /></div>`;
            }
            return "";
        });

        // Enable marked parsing on the agent output (allows beautiful tables, bullets, lists)
        const parsedContent = marked.parse(cleanText.trim());
        
        div.innerHTML = `
            <div class="agent-message-header">${sender.toUpperCase()} (Chief of Staff)</div>
            <div class="agent-message-content">${parsedContent}${mediaHtml}</div>
        `;
    }
    
    commandLog.appendChild(div);
    commandLog.scrollTop = commandLog.scrollHeight;
}

function appendLoader(text) {
    const loaderId = "loader_" + Date.now();
    const div = document.createElement("div");
    div.className = "loader-bubble";
    div.id = loaderId;
    div.innerHTML = `
        <span class="loader-dot"></span>
        <span class="loader-dot"></span>
        <span class="loader-dot"></span>
        <span>${text}</span>
    `;
    commandLog.appendChild(div);
    commandLog.scrollTop = commandLog.scrollHeight;
    return loaderId;
}

function removeLoader(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// Load command history on boot
async function loadCommandHistory() {
    try {
        const res = await fetch("/api/commands");
        if (!res.ok) return;
        const history = await res.json();
        
        // Reverse history to show oldest first
        history.reverse();
        
        history.forEach(cmd => {
            appendMessage("user", cmd.prompt);
            if (cmd.status === "done") {
                appendMessage(cmd.agent_id, cmd.response);
            } else if (cmd.status === "failed") {
                appendMessage("system", `Command failed: ${cmd.response}`);
            } else if (cmd.status === "running") {
                appendMessage("system", `Henry is currently processing: "${cmd.prompt}"`);
            }
        });
    } catch (e) {
        console.error("Failed to load command history", e);
    }
}

// --- Agent Roster Grid ---
async function loadAgentRoster() {
    try {
        const res = await fetch("/api/agents");
        if (!res.ok) return;
        agentsData = await res.json();
        
        const container = document.getElementById("agents-container");
        container.innerHTML = "";
        
        agentsData.forEach(agent => {
            const card = document.createElement("div");
            // Highlight classes based on role
            card.className = `agent-profile-card ${agent.id}`;
            
            let iconCode = '<i class="fa-solid fa-robot"></i>';
            if (agent.id === "henry") iconCode = '<i class="fa-solid fa-crown text-purple"></i>';
            else if (agent.id === "coder") iconCode = '<i class="fa-solid fa-code text-purple"></i>';
            else if (agent.id === "scout") iconCode = '<i class="fa-solid fa-binoculars text-green"></i>';
            else if (agent.id === "writer") iconCode = '<i class="fa-solid fa-file-pen"></i>';
            else if (agent.id === "watcher") iconCode = '<i class="fa-solid fa-eye text-gold"></i>';

            let roleStr = "Agent";
            if (agent.id === "henry") roleStr = "Chief of Staff & Boss";
            else if (agent.id === "coder") roleStr = "Software Engineer";
            else if (agent.id === "scout") roleStr = "Research Analyst";
            else if (agent.id === "writer") roleStr = "Content Creator";
            else if (agent.id === "watcher") roleStr = "System Monitor";

            // Extract brief description from SOUL
            let desc = "Active participant in the MedSpa operations.";
            if (agent.id === "henry") desc = "Strategic orchestrator. Translates Sumar's directives into subordinate task delegations.";
            else if (agent.id === "coder") desc = "Develops & updates Derma Art homepage. Manages Nginx servers and asset optimizations.";
            else if (agent.id === "scout") desc = "Scans competitive prices, local demand, and financing frameworks (Cherry, CareCredit).";
            else if (agent.id === "writer") desc = "Drafts minimalist copy, distinction blurbs, virtual consult texts, and review answers.";
            else if (agent.id === "watcher") desc = "Monitors memory swap caps, API status, and droplet resource boundaries.";

            card.innerHTML = `
                <div class="agent-card-header">
                    <div class="agent-card-avatar">${iconCode}</div>
                    <div>
                        <div class="agent-card-name">${agent.name}</div>
                        <div class="agent-card-role">${roleStr}</div>
                    </div>
                </div>
                <div class="agent-card-desc">${desc}</div>
                <div class="agent-card-meta">
                    <span>STATUS: ACTIVE</span>
                    <span>REST API</span>
                </div>
            `;
            
            card.addEventListener("click", () => showAgentModal(agent));
            container.appendChild(card);
        });
    } catch (e) {
        console.error("Roster load failed", e);
    }
}

// Modal handling
const agentModal = document.getElementById("agent-modal");
const modalTitle = document.getElementById("modal-agent-title");
const modalSoul = document.getElementById("modal-soul");
const modalMem = document.getElementById("modal-mem");
let currentModalAgent = null;

function showAgentModal(agent) {
    currentModalAgent = agent.id;
    modalTitle.innerText = `${agent.name} — Profile Detail`;
    modalSoul.innerHTML = marked.parse(agent.soul || "# SOUL.md missing");
    modalMem.innerHTML = marked.parse(agent.memory || "# MEMORY.md missing");
    
    // Switch to SOUL subtab by default
    document.querySelectorAll(".modal-tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelector('.modal-tab-btn[data-subtab="modal-soul"]').classList.add("active");
    document.querySelectorAll(".modal-subpane").forEach(p => p.classList.remove("active"));
    document.getElementById("modal-soul").classList.add("active");
    
    // Initial files load
    loadAgentFiles(agent.id);
    
    agentModal.classList.add("active");
}

document.getElementById("modal-close").addEventListener("click", () => {
    agentModal.classList.remove("active");
});

window.addEventListener("click", (e) => {
    if (e.target === agentModal) {
        agentModal.classList.remove("active");
    }
});

// Modal subtabs
document.querySelectorAll(".modal-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".modal-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        const subpaneId = btn.getAttribute("data-subtab");
        document.querySelectorAll(".modal-subpane").forEach(p => p.classList.remove("active"));
        document.getElementById(subpaneId).classList.add("active");
        
        if (subpaneId === "modal-files" && currentModalAgent) {
            loadAgentFiles(currentModalAgent);
        }
    });
});

// Workspace Files Management in Agent Modal
const filesUploadZone = document.getElementById("files-upload-zone");
const modalFileInput = document.getElementById("modal-file-input");
const modalFilesList = document.getElementById("modal-files-list");

if (filesUploadZone && modalFileInput) {
    filesUploadZone.addEventListener("click", () => {
        modalFileInput.click();
    });

    modalFileInput.addEventListener("change", async () => {
        if (!currentModalAgent) return;
        for (let file of modalFileInput.files) {
            await uploadAgentFile(currentModalAgent, file);
        }
        modalFileInput.value = "";
        loadAgentFiles(currentModalAgent);
    });

    // Drag and drop events
    ["dragenter", "dragover"].forEach(eventName => {
        filesUploadZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            filesUploadZone.classList.add("dragover");
        }, false);
    });

    ["dragleave", "drop"].forEach(eventName => {
        filesUploadZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            filesUploadZone.classList.remove("dragover");
        }, false);
    });

    filesUploadZone.addEventListener("drop", async (e) => {
        if (!currentModalAgent) return;
        const dt = e.dataTransfer;
        const files = dt.files;
        for (let file of files) {
            await uploadAgentFile(currentModalAgent, file);
        }
        loadAgentFiles(currentModalAgent);
    }, false);
}

async function uploadAgentFile(agentId, file) {
    const formData = new FormData();
    formData.append("file", file);
    
    try {
        const res = await fetch(`/api/media/upload?agent_id=${agentId}`, {
            method: "POST",
            body: formData
        });
        if (!res.ok) {
            const err = await res.json();
            alert(`Failed to upload ${file.name}: ${err.detail || "Upload error"}`);
        }
    } catch (e) {
        alert(`Failed to upload ${file.name}: ${e.message}`);
    }
}

async function loadAgentFiles(agentId) {
    if (!modalFilesList) return;
    modalFilesList.innerHTML = `<p class="text-secondary" style="grid-column: 1/-1; text-align: center; padding: 20px;">Loading workspace files...</p>`;
    
    try {
        const res = await fetch(`/api/media/list?agent_id=${agentId}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        
        modalFilesList.innerHTML = "";
        if (!data.files || data.files.length === 0) {
            modalFilesList.innerHTML = `<p class="text-secondary" style="grid-column: 1/-1; text-align: center; padding: 20px;"><i class="fa-regular fa-file-image" style="font-size: 2em; margin-bottom: 8px; display: block;"></i>No pictures or videos in workspace</p>`;
            return;
        }
        
        data.files.forEach(file => {
            const isVideo = file.type === "video";
            const item = document.createElement("div");
            item.className = "workspace-file-item";
            
            const fileUrl = `/api/media/download?agent_id=${agentId}&filename=${encodeURIComponent(file.name)}`;
            
            let previewContent = "";
            if (isVideo) {
                previewContent = `<span class="video-placeholder"><i class="fa-solid fa-circle-play"></i></span>`;
            } else {
                previewContent = `<img src="${fileUrl}" alt="${escapeHTML(file.name)}" loading="lazy">`;
            }
            
            const sizeKB = (file.size / 1024).toFixed(1);
            
            item.innerHTML = `
                <div class="file-preview-box">
                    ${previewContent}
                    <div class="file-overlay">
                        <a href="${fileUrl}" target="_blank" class="file-action-btn download-btn" title="Download/View"><i class="fa-solid fa-download"></i></a>
                        <button class="file-action-btn delete-btn" onclick="deleteAgentFile('${agentId}', '${escapeJS(file.name)}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div class="file-info-box">
                    <div class="file-name-label" title="${escapeHTML(file.name)}">${escapeHTML(file.name)}</div>
                    <div class="file-size-label">${sizeKB} KB</div>
                </div>
            `;
            modalFilesList.appendChild(item);
        });
    } catch (e) {
        modalFilesList.innerHTML = `<p class="text-danger" style="grid-column: 1/-1; text-align: center; padding: 20px;">Error loading files: ${e.message}</p>`;
    }
}

window.deleteAgentFile = async function(agentId, filename) {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;
    try {
        const res = await fetch(`/api/media/delete?agent_id=${agentId}&filename=${encodeURIComponent(filename)}`, {
            method: "POST"
        });
        if (res.ok) {
            loadAgentFiles(agentId);
        } else {
            alert("Failed to delete file.");
        }
    } catch (e) {
        alert(`Error deleting file: ${e.message}`);
    }
};

function escapeJS(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// --- Automated Cron Jobs ---
async function loadCronJobs() {
    try {
        const res = await fetch("/api/cron");
        if (!res.ok) return;
        const data = await res.json();
        
        const container = document.getElementById("cron-container");
        container.innerHTML = "";
        
        if (!data.jobs || data.jobs.length === 0) {
            container.innerHTML = `<div class="card"><p class="text-secondary">No cron jobs configured.</p></div>`;
            return;
        }
        
        data.jobs.forEach(job => {
            const card = document.createElement("div");
            card.className = "cron-card";
            
            let desc = "Scheduled automation script.";
            if (job.id === "health-check-main") desc = "Pings CPU usage, RAM utilization, and Nginx logs every 5 minutes. Logs alerts to portal.";
            else if (job.id === "session-cleanup-hourly") desc = "Clears large Node processes, archives idle session tokens, and cleans local system temp files.";
            else if (job.id === "morning-research-daily") desc = "Automated Scout scan at 8:00 AM. Gathers competitor aesthetic prices and local clinic updates.";
            else if (job.id === "daily-memo-writer") desc = "Runs at 9:00 AM. Writer reviews Scout's scan and compiles a morning operations briefing.";
            else if (job.id === "nightly-rnd-henry") desc = "Runs at 11:00 PM. Henry synthesizes the day's activities and prepares tomorrow's delegations.";

            const timeStr = job.last_run ? new Date(job.last_run).toLocaleString() : "Never run";
            const statusClass = job.last_status === "ok" ? "badge-active" : job.last_status === "never run" ? "badge-warn" : "badge-inactive";

            card.innerHTML = `
                <div class="cron-card-header">
                    <div>
                        <div class="cron-name">${job.name}</div>
                        <div class="cron-schedule"><i class="fa-regular fa-calendar"></i> ${job.schedule}</div>
                    </div>
                    <span class="badge ${statusClass}">${job.last_status}</span>
                </div>
                <div class="cron-desc">${desc}</div>
                <div class="cron-status-row">
                    <div><span class="cron-lbl">Agent:</span> <code class="text-cyan">${job.agent_id}</code></div>
                    <div><span class="cron-lbl">Last Run:</span> <span>${timeStr}</span></div>
                </div>
                <div class="cron-btn-sec">
                    <button class="btn btn-primary" onclick="triggerCronJob('${job.id}')">Run Now</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        console.error("Cron load failed", e);
    }
}

async function triggerCronJob(jobId) {
    try {
        const res = await fetch(`/api/cron/${jobId}/run`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to trigger");
        alert(`Job "${jobId}" triggered! Check Reports tab in a few minutes.`);
        setTimeout(loadCronJobs, 2000);
    } catch (e) {
        alert(`Failed to run job: ${e.message}`);
    }
}

// --- Reports & Briefings Archive ---
async function loadReports() {
    try {
        const res = await fetch("/api/reports");
        if (!res.ok) return;
        const reports = await res.json();
        
        const listContainer = document.getElementById("reports-list-container");
        listContainer.innerHTML = "";
        
        if (reports.length === 0) {
            listContainer.innerHTML = `<p class="text-secondary" style="padding:16px">No reports generated yet. Run a cron job or message Henry to generate one.</p>`;
            return;
        }
        
        reports.forEach((rep, idx) => {
            const item = document.createElement("div");
            item.className = `report-item ${rep.id === selectedReportId ? "active" : ""}`;
            
            const cleanDate = new Date(rep.created_at.replace(" ", "T") + "Z");
            const dateStr = cleanDate.toLocaleDateString();
            const timeStr = cleanDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            item.innerHTML = `
                <div class="report-item-title">${escapeHTML(rep.title)}</div>
                <div class="report-item-meta">
                    <span>Agent: <code class="text-cyan">${rep.agent_id}</code></span>
                    <span>${dateStr} ${timeStr}</span>
                </div>
            `;
            
            item.addEventListener("click", () => {
                // Remove active classes
                document.querySelectorAll(".report-item").forEach(el => el.classList.remove("active"));
                item.classList.add("active");
                
                selectedReportId = rep.id;
                renderReportViewer(rep);
            });
            
            listContainer.appendChild(item);
            
            // Auto-load first report on boot
            if (idx === 0 && selectedReportId === null) {
                item.click();
            }
        });
    } catch (e) {
        console.error("Reports load failed", e);
    }
}

function renderReportViewer(rep) {
    const titleEl = document.getElementById("report-view-title");
    const metaEl = document.getElementById("report-view-meta");
    const bodyEl = document.getElementById("report-view-body");
    
    titleEl.innerText = rep.title;
    
    const cleanDate = new Date(rep.created_at.replace(" ", "T") + "Z");
    const dateStr = cleanDate.toLocaleString();
    metaEl.innerHTML = `Compiled by <code class="text-cyan">${rep.agent_id}</code> on <span>${dateStr}</span>`;
    
    // Parse content using marked
    bodyEl.innerHTML = marked.parse(rep.content);
}

// --- Utilities ---
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
// --- Collapsible Sidebar Toggle & Hooks ---
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const appContainer = document.querySelector(".app-container");

if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
        if (window.innerWidth <= 992) {
            // Mobile drawer toggle
            appContainer.classList.toggle("sidebar-active");
        } else {
            // Desktop Zen Mode toggle
            appContainer.classList.toggle("sidebar-collapsed");
        }
    });
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", () => {
        appContainer.classList.remove("sidebar-active");
    });
}

// --- Voice speech-to-text input (Web Speech API) ---
const voiceBtn = document.getElementById("voice-input-btn");
const cmdInput = document.getElementById("command-input");

if (voiceBtn && cmdInput) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        let isListening = false;
        let originalValue = "";

        voiceBtn.addEventListener("click", () => {
            if (isListening) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });

        recognition.onstart = () => {
            isListening = true;
            voiceBtn.classList.add("listening");
            cmdInput.placeholder = "Listening... Speak now.";
            originalValue = cmdInput.value.trim();
        };

        recognition.onend = () => {
            isListening = false;
            voiceBtn.classList.remove("listening");
            cmdInput.placeholder = "Ask Henry to draft copy, research competitors, or deploy changes...";
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            isListening = false;
            voiceBtn.classList.remove("listening");
            cmdInput.placeholder = "Speech error: " + event.error;
            setTimeout(() => {
                cmdInput.placeholder = "Ask Henry to draft copy, research competitors, or deploy changes...";
            }, 3000);
        };

        recognition.onresult = (event) => {
            let transcript = "";
            for (let i = 0; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
            }
            cmdInput.value = originalValue + (originalValue ? " " : "") + transcript.trim();
            cmdInput.focus();
        };
    } else {
        // Fallback for unsupported browsers
        voiceBtn.title = "Voice Input (Not supported in this browser)";
        voiceBtn.style.opacity = "0.4";
        voiceBtn.addEventListener("click", () => {
            alert("Speech recognition is not supported in this browser. Please use Google Chrome, Apple Safari, or Microsoft Edge.");
        });
    }
}

// --- Credentials & Integrations Management ---
async function loadCredentials() {
    try {
        const res = await fetch("/api/credentials");
        if (!res.ok) throw new Error("Failed to load integrations");
        const data = await res.json();
        
        // WordPress
        document.getElementById("wp_url").value = data.wordpress.values.wp_url || "";
        document.getElementById("wp_username").value = data.wordpress.values.wp_username || "";
        document.getElementById("wp_password").value = data.wordpress.values.wp_password || "";
        setCheckboxValues("wp_agents", data.wordpress.allowed_agents);
        
        // Instagram
        document.getElementById("ig_account_id").value = data.instagram.values.ig_account_id || "";
        document.getElementById("ig_access_token").value = data.instagram.values.ig_access_token || "";
        setCheckboxValues("ig_agents", data.instagram.allowed_agents);
        
        // Facebook
        document.getElementById("fb_page_id").value = data.facebook.values.fb_page_id || "";
        document.getElementById("fb_access_token").value = data.facebook.values.fb_access_token || "";
        setCheckboxValues("fb_agents", data.facebook.allowed_agents);
        
        // TikTok
        document.getElementById("tiktok_access_token").value = data.tiktok.values.tiktok_access_token || "";
        setCheckboxValues("tiktok_agents", data.tiktok.allowed_agents);
        
        // Google Business Profile
        document.getElementById("gb_account_id").value = data.google_business.values.gb_account_id || "";
        document.getElementById("gb_location_id").value = data.google_business.values.gb_location_id || "";
        document.getElementById("gb_client_id").value = data.google_business.values.gb_client_id || "";
        document.getElementById("gb_client_secret").value = data.google_business.values.gb_client_secret || "";
        document.getElementById("gb_refresh_token").value = data.google_business.values.gb_refresh_token || "";
        setCheckboxValues("gb_agents", data.google_business.allowed_agents);
        
    } catch (e) {
        console.error("Failed to load credentials", e);
    }
}

function setCheckboxValues(name, allowedAgents) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(checkbox => {
        checkbox.checked = allowedAgents.includes(checkbox.value);
    });
}

function getCheckboxValues(name) {
    const checked = [];
    document.querySelectorAll(`input[name="${name}"]:checked`).forEach(checkbox => {
        checked.push(checkbox.value);
    });
    return checked;
}

const credentialsForm = document.getElementById("credentials-form");
if (credentialsForm) {
    credentialsForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const saveStatus = document.getElementById("credentials-save-status");
        saveStatus.className = "save-status-msg";
        saveStatus.innerText = "Saving integrations...";
        
        const payload = {
            wordpress: {
                values: {
                    wp_url: document.getElementById("wp_url").value.trim(),
                    wp_username: document.getElementById("wp_username").value.trim(),
                    wp_password: document.getElementById("wp_password").value
                },
                allowed_agents: getCheckboxValues("wp_agents")
            },
            instagram: {
                values: {
                    ig_account_id: document.getElementById("ig_account_id").value.trim(),
                    ig_access_token: document.getElementById("ig_access_token").value
                },
                allowed_agents: getCheckboxValues("ig_agents")
            },
            facebook: {
                values: {
                    fb_page_id: document.getElementById("fb_page_id").value.trim(),
                    fb_access_token: document.getElementById("fb_access_token").value
                },
                allowed_agents: getCheckboxValues("fb_agents")
            },
            tiktok: {
                values: {
                    tiktok_access_token: document.getElementById("tiktok_access_token").value
                },
                allowed_agents: getCheckboxValues("tiktok_agents")
            },
            google_business: {
                values: {
                    gb_account_id: document.getElementById("gb_account_id").value.trim(),
                    gb_location_id: document.getElementById("gb_location_id").value.trim(),
                    gb_client_id: document.getElementById("gb_client_id").value,
                    gb_client_secret: document.getElementById("gb_client_secret").value,
                    gb_refresh_token: document.getElementById("gb_refresh_token").value
                },
                allowed_agents: getCheckboxValues("gb_agents")
            }
        };
        
        try {
            const res = await fetch("/api/credentials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                saveStatus.className = "save-status-msg success";
                saveStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> Saved successfully!';
                setTimeout(loadCredentials, 1000);
            } else {
                const err = await res.json();
                saveStatus.className = "save-status-msg error";
                saveStatus.innerText = "Error: " + (err.detail || "Failed to save");
            }
        } catch (err) {
            saveStatus.className = "save-status-msg error";
            saveStatus.innerText = "Connection error: " + err.message;
        }
    });
}

// --- App Bootstrap ---
async function bootstrap() {
    await pollSystemStats();
    await loadCommandHistory();
    await loadAgentRoster();
    await loadCronJobs();
    await loadReports();
    
    // Setup loops
    setInterval(pollSystemStats, 10000); // 10s system metrics
    setInterval(loadCronJobs, 30000);   // 30s cron list refresh
    setInterval(loadReports, 30000);    // 30s reports list refresh
}

bootstrap();
