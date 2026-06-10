import os
import sys
import sqlite3
import json
import urllib.request
import urllib.error
import psutil
import subprocess
from datetime import datetime
from fastapi import FastAPI, HTTPException, File, UploadFile, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import shutil

app = FastAPI(title="Derma Art MedSpa Agent Portal")

DB_PATH = "/opt/dermaart-portal/dermaart.db"
OPENCLAW_HOME = "/home/clawuser/.openclaw"
GATEWAY_URL = "http://127.0.0.1:18789/v1/chat/completions"

# Ensure DB directory exists
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT,
        prompt TEXT,
        response TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT,
        title TEXT,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()
    conn.close()

init_db()

# Request schemas
class CommandRequest(BaseModel):
    agent_id: str
    prompt: str

class ReportRequest(BaseModel):
    content: str

@app.get("/api/system")
def get_system_status():
    # Service status
    try:
        r = subprocess.run(["systemctl", "is-active", "openclaw"], capture_output=True, text=True, timeout=2)
        gateway_active = r.stdout.strip() == "active"
    except Exception:
        gateway_active = False

    # Uptime and memory for openclaw process
    process_info = None
    for proc in psutil.process_iter(["pid", "name", "create_time", "memory_info"]):
        try:
            if "openclaw" in proc.info["name"].lower():
                uptime_s = datetime.now().timestamp() - proc.info["create_time"]
                h, rem = divmod(int(uptime_s), 3600)
                m, s = divmod(rem, 60)
                mem_mb = proc.info["memory_info"].rss / 1024 / 1024
                process_info = {
                    "pid": proc.info["pid"],
                    "uptime": f"{h}h {m}m {s}s",
                    "mem_mb": round(mem_mb, 1),
                }
                break
        except Exception:
            pass

    # System metrics
    try:
        vm = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        metrics = {
            "cpu_pct": psutil.cpu_percent(interval=0.1),
            "ram_used": round(vm.used / 1024**3, 2),
            "ram_total": round(vm.total / 1024**3, 2),
            "ram_pct": vm.percent,
            "disk_used": round(disk.used / 1024**3, 1),
            "disk_total": round(disk.total / 1024**3, 1),
            "disk_pct": disk.percent,
        }
    except Exception as e:
        metrics = {"error": str(e)}

    return {
        "gateway_active": gateway_active,
        "process": process_info,
        "metrics": metrics,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

@app.get("/api/agents")
def get_agents():
    agents = ["henry", "coder", "scout", "writer", "watcher"]
    result = []
    for a in agents:
        soul_path = os.path.join(OPENCLAW_HOME, f"workspace-{a}", "SOUL.md")
        mem_path = os.path.join(OPENCLAW_HOME, f"workspace-{a}", "MEMORY.md")
        
        soul_content = ""
        if os.path.exists(soul_path):
            with open(soul_path, "r", encoding="utf-8") as f:
                soul_content = f.read()
                
        mem_content = ""
        if os.path.exists(mem_path):
            with open(mem_path, "r", encoding="utf-8") as f:
                mem_content = f.read()

        result.append({
            "id": a,
            "name": a.capitalize(),
            "soul": soul_content,
            "memory": mem_content,
        })
    return result

@app.get("/api/commands")
def get_command_history():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM commands ORDER BY id DESC LIMIT 50")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/commands")
def submit_command(req: CommandRequest):
    # Insert pending status
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO commands (agent_id, prompt, response, status) VALUES (?, ?, ?, ?)",
        (req.agent_id, req.prompt, "", "running")
    )
    cmd_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # Call OpenClaw Gateway API via HTTP REST
    model_name = req.agent_id
    if not model_name.startswith("openclaw/"):
        model_name = f"openclaw/{model_name}"
        
    payload = {
        "model": model_name,
        "messages": [{"role": "user", "content": req.prompt}]
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        api_req = urllib.request.Request(
            GATEWAY_URL, 
            data=json.dumps(payload).encode("utf-8"), 
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(api_req, timeout=120) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            
            # Parse answer (OpenAI chat completions format)
            answer = ""
            if "choices" in res_data and len(res_data["choices"]) > 0:
                answer = res_data["choices"][0]["message"]["content"]
            else:
                answer = json.dumps(res_data)
                
            status = "done"
    except urllib.error.HTTPError as e:
        status = "failed"
        try:
            answer = f"Gateway Error {e.code}: {e.read().decode('utf-8')}"
        except Exception:
            answer = f"Gateway HTTP Error {e.code}: {e.reason}"
    except Exception as e:
        status = "failed"
        answer = f"Portal Connection Error: {e}"

    # Update database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE commands SET response = ?, status = ? WHERE id = ?",
        (answer, status, cmd_id)
    )
    conn.commit()
    conn.close()

    if status == "failed":
        raise HTTPException(status_code=500, detail=answer)

    return {"id": cmd_id, "agent_id": req.agent_id, "prompt": req.prompt, "response": answer, "status": status}

@app.get("/api/reports")
def get_reports():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reports ORDER BY id DESC LIMIT 50")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/reports/submit")
def submit_report(req: ReportRequest):
    # Parse the text report sent from agent discord-post replacement script.
    content = req.content.strip()
    if not content:
        return {"status": "ignored"}

    # Attempt to parse agent name and title
    # Standard reports have structures like:
    # "Henry — Chief of Staff's Report" or "Scout — Research Bot's Report"
    # Or titles inside the Markdown block.
    lines = content.split("\n")
    agent_id = "unknown"
    title = "System Report"

    # Quick heuristics to extract clean details
    for line in lines[:3]:
        if "Henry" in line:
            agent_id = "henry"
            title = "Henry's Strategic Retrospective"
        elif "Coder" in line:
            agent_id = "coder"
            title = "Coder's Development Report"
        elif "Scout" in line:
            agent_id = "scout"
            title = "Scout's Market Research scan"
        elif "Writer" in line:
            agent_id = "writer"
            title = "Writer's Operational Memo"
        elif "Watcher" in line:
            agent_id = "watcher"
            title = "Watcher's Health Alert"

    # Extract Markdown title if present
    for line in lines:
        if line.startswith("# "):
            title = line[2:].strip()
            break
        elif line.startswith("## "):
            title = line[3:].strip()
            break

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO reports (agent_id, title, content) VALUES (?, ?, ?)",
        (agent_id, title, content)
    )
    conn.commit()
    conn.close()
    return {"status": "saved"}

@app.get("/api/cron")
def get_cron_jobs():
    db_path = "/home/clawuser/.openclaw/state/openclaw.sqlite"
    if not os.path.exists(db_path):
        return {"jobs": []}
        
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        # Query active cron jobs from SQLite
        cursor.execute("SELECT job_id, name, agent_id, schedule_expr, enabled, last_run_at_ms, last_run_status, last_error FROM cron_jobs")
        rows = cursor.fetchall()
        conn.close()
        
        result = []
        for r in rows:
            status = r["last_run_status"]
            if not status:
                status = "never run"
            
            result.append({
                "id": r["job_id"],
                "name": r["name"],
                "agent_id": r["agent_id"],
                "schedule": r["schedule_expr"],
                "enabled": bool(r["enabled"]),
                "last_run": r["last_run_at_ms"],
                "last_status": status,
                "last_error": r["last_error"],
            })
        return {"jobs": result}
    except Exception as e:
        return {"error": f"Failed to load jobs from SQLite: {e}"}

@app.post("/api/cron/{job_id}/run")
def run_cron_job(job_id: str):
    # Runs the job asynchronously using openclaw cron run
    try:
        subprocess.Popen(
            ["sudo", "-u", "clawuser", "openclaw", "cron", "run", job_id],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )
        return {"status": "triggered"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

ALLOWED_MEDIA_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".mov", ".avi", ".webm"}

@app.post("/api/media/upload")
def upload_media(agent_id: str, file: UploadFile = File(...)):
    # Validate agent
    valid_agents = ["henry", "coder", "scout", "writer", "watcher"]
    if agent_id not in valid_agents:
        raise HTTPException(status_code=400, detail="Invalid agent ID")
    
    # Sanitize filename
    filename = os.path.basename(file.filename)
    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_MEDIA_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported media file type")
    
    # Ensure workspace target path exists
    agent_workspace = os.path.join(OPENCLAW_HOME, f"workspace-{agent_id}")
    if not os.path.exists(agent_workspace):
        raise HTTPException(status_code=404, detail=f"Agent workspace not found: {agent_workspace}")
        
    target_path = os.path.join(agent_workspace, filename)
    
    try:
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # chown to clawuser if we run as root
        if os.name != "nt" and os.getuid() == 0:
            try:
                import pwd
                pw = pwd.getpwnam("clawuser")
                os.chown(target_path, pw.pw_uid, pw.pw_gid)
            except Exception:
                subprocess.run(["chown", "clawuser:clawuser", target_path])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write file: {e}")
        
    return {"status": "success", "filename": filename, "path": target_path}

@app.get("/api/media/list")
def list_media(agent_id: str):
    valid_agents = ["henry", "coder", "scout", "writer", "watcher"]
    if agent_id not in valid_agents:
        raise HTTPException(status_code=400, detail="Invalid agent ID")
        
    agent_workspace = os.path.join(OPENCLAW_HOME, f"workspace-{agent_id}")
    if not os.path.exists(agent_workspace):
        return {"files": []}
        
    files = []
    try:
        for item in os.listdir(agent_workspace):
            item_path = os.path.join(agent_workspace, item)
            if os.path.isfile(item_path):
                _, ext = os.path.splitext(item.lower())
                if ext in ALLOWED_MEDIA_EXTENSIONS:
                    stat_info = os.stat(item_path)
                    files.append({
                        "name": item,
                        "size": stat_info.st_size,
                        "type": "video" if ext in [".mp4", ".mov", ".avi", ".webm"] else "image",
                        "modified": datetime.fromtimestamp(stat_info.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
                    })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list directory: {e}")
        
    files.sort(key=lambda x: x["name"])
    return {"files": files}

@app.get("/api/media/download")
def download_media(agent_id: str, filename: str):
    valid_agents = ["henry", "coder", "scout", "writer", "watcher"]
    if agent_id not in valid_agents:
        raise HTTPException(status_code=400, detail="Invalid agent ID")
        
    filename = os.path.basename(filename)
    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_MEDIA_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Access denied")
        
    agent_workspace = os.path.join(OPENCLAW_HOME, f"workspace-{agent_id}")
    file_path = os.path.join(agent_workspace, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(file_path)

@app.post("/api/media/delete")
def delete_media(agent_id: str, filename: str):
    valid_agents = ["henry", "coder", "scout", "writer", "watcher"]
    if agent_id not in valid_agents:
        raise HTTPException(status_code=400, detail="Invalid agent ID")
        
    filename = os.path.basename(filename)
    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_MEDIA_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Access denied")
        
    agent_workspace = os.path.join(OPENCLAW_HOME, f"workspace-{agent_id}")
    file_path = os.path.join(agent_workspace, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    try:
        os.remove(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {e}")
        
@app.get("/api/media/generated")
def download_generated_media(filepath: str):
    # Ensure the target file is inside openclaw home media directory for safety
    if not filepath.startswith(OPENCLAW_HOME + "/media/"):
        raise HTTPException(status_code=400, detail="Access denied")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)

# Mount static folder
app.mount("/", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static"), html=True), name="static")
