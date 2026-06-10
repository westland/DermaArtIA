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

// --- Command Console & Chat ---
const commandForm = document.getElementById("command-form");
const commandInput = document.getElementById("command-input");
const commandLog = document.getElementById("command-log");
const submitBtn = document.getElementById("command-submit-btn");

// Handle command submit
commandForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const prompt = commandInput.value.trim();
    if (!prompt) return;
    
    // Clear input
    commandInput.value = "";
    
    // Add user bubble to log
    appendMessage("user", prompt);
    
    // Disable inputs and add loader bubble
    commandInput.disabled = true;
    submitBtn.disabled = true;
    const loaderId = appendLoader("Henry is thinking...");
    
    try {
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
            // Re-fetch reports in case Henry generated a new report/memo
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
        
        // Enable marked parsing on the agent output (allows beautiful tables, bullets, lists)
        const parsedContent = marked.parse(text);
        
        div.innerHTML = `
            <div class="agent-message-header">${sender.toUpperCase()} (Chief of Staff)</div>
            <div class="agent-message-content">${parsedContent}</div>
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
                    <span>REST ONLY</span>
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

function showAgentModal(agent) {
    modalTitle.innerText = `${agent.name} — Profile Detail`;
    modalSoul.innerHTML = marked.parse(agent.soul || "# SOUL.md missing");
    modalMem.innerHTML = marked.parse(agent.memory || "# MEMORY.md missing");
    
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
    });
});

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
            
            const dateStr = new Date(rep.created_at).toLocaleDateString();
            const timeStr = new Date(rep.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
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
    
    const dateStr = new Date(rep.created_at).toLocaleString();
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
            const transcript = event.results[0][0].transcript;
            if (cmdInput.value.trim() === "") {
                cmdInput.value = transcript;
            } else {
                cmdInput.value += " " + transcript;
            }
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
