#!/usr/bin/env python3
import os
import sys
import paramiko

# Set encoding to utf-8 to avoid console output errors on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def sftp_upload_dir(sftp, local_dir, remote_dir):
    """Recursively uploads a local directory to a remote directory via SFTP."""
    try:
        sftp.mkdir(remote_dir)
    except OSError:
        pass # Directory already exists
        
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"
        
        if os.path.isdir(local_path):
            sftp_upload_dir(sftp, local_path, remote_path)
        else:
            print(f"Uploading file: {item} -> {remote_path}...")
            sftp.put(local_path, remote_path)
            sftp.chmod(remote_path, 0o644)

def deploy():
    host = "174.138.46.163"
    port = 22
    username = "root"
    password = "#1DermaArts"
    
    # Resolve local_base dynamically based on where the script is located
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if os.path.basename(current_dir) == "DermaArtIA":
        local_base = os.path.dirname(current_dir)
    else:
        local_base = current_dir
    
    print(f"Connecting to {host}:{port} via SSH as {username}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(host, port=port, username=username, password=password, timeout=15)
        print("SSH Connection established successfully!")
    except Exception as e:
        print(f"Failed to connect: {e}")
        sys.exit(1)
        
    def run_cmd(cmd):
        print(f"Running command: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        exit_code = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        if out:
            print(f"STDOUT:\n{out}")
        if err:
            print(f"STDERR:\n{err}")
        return exit_code, out, err

    sftp = ssh.open_sftp()
    
    # 1. Upload FastAPI portal backend & static frontend
    print("\n--- Uploading Bespoke Portal Backend & static Frontend ---")
    local_portal_dir = os.path.join(local_base, "portal")
    
    # Upload main.py
    local_main = os.path.join(local_portal_dir, "main.py")
    sftp.put(local_main, "/opt/dermaart-portal/main.py")
    sftp.chmod("/opt/dermaart-portal/main.py", 0o644)
    
    # Upload static folder contents
    local_static_dir = os.path.join(local_portal_dir, "static")
    sftp_upload_dir(sftp, local_static_dir, "/opt/dermaart-portal/static")
    
    # 2. Upload Coder Workspace Multimedia & Publishing scripts
    print("\n--- Uploading Coder Workspace Multimedia & Publishing Tools ---")
    run_cmd("mkdir -p /home/clawuser/.openclaw/workspace-coder/skills/media-publishing")
    
    local_workspace_dir = os.path.join(local_portal_dir, "coder_workspace")
    
    # Upload wordpress_update.py
    wp_script_local = os.path.join(local_workspace_dir, "wordpress_update.py")
    wp_script_remote = "/home/clawuser/.openclaw/workspace-coder/wordpress_update.py"
    print(f"Uploading: {wp_script_local} -> {wp_script_remote}")
    sftp.put(wp_script_local, wp_script_remote)
    sftp.chmod(wp_script_remote, 0o755)
    
    # Upload instagram_post.py
    ig_script_local = os.path.join(local_workspace_dir, "instagram_post.py")
    ig_script_remote = "/home/clawuser/.openclaw/workspace-coder/instagram_post.py"
    print(f"Uploading: {ig_script_local} -> {ig_script_remote}")
    sftp.put(ig_script_local, ig_script_remote)
    sftp.chmod(ig_script_remote, 0o755)
    
    # Upload skill
    skill_local = os.path.join(local_workspace_dir, "skills", "media-publishing", "SKILL.md")
    skill_remote = "/home/clawuser/.openclaw/workspace-coder/skills/media-publishing/SKILL.md"
    print(f"Uploading: {skill_local} -> {skill_remote}")
    sftp.put(skill_local, skill_remote)
    sftp.chmod(skill_remote, 0o644)
    
    # 3. Upload all deployment configs
    print("\n--- Uploading Deployment configs ---")
    local_configs_dir = os.path.join(local_base, "DermaArtIA", "deploy", "configs")
    sftp_upload_dir(sftp, local_configs_dir, "/root/deploy/configs")
    
    sftp.close()
    print("All files uploaded successfully via SFTP!")
    
    # 4. Copy updated configs to active workspaces & fix permissions
    print("\n--- Updating Active Workspace and Permissions ---")
    agents = ["coder", "henry", "scout", "writer", "watcher"]
    for agent in agents:
        run_cmd(f"mkdir -p /home/clawuser/.openclaw/workspace-{agent}/skills")
        run_cmd(f"cp -r /root/deploy/configs/workspace-{agent}/. /home/clawuser/.openclaw/workspace-{agent}/")
        run_cmd(f"chown -R clawuser:clawuser /home/clawuser/.openclaw/workspace-{agent}")
        
    # 4.5 Copy master configuration files to openclaw home
    print("\n--- Updating Master Configurations ---")
    run_cmd("mkdir -p /home/clawuser/.openclaw/cron")
    run_cmd("cp /root/deploy/configs/jobs.json /home/clawuser/.openclaw/cron/jobs.json")
    run_cmd("chown clawuser:clawuser /home/clawuser/.openclaw/cron/jobs.json")
    run_cmd("chmod 600 /home/clawuser/.openclaw/cron/jobs.json")
    
    # Merge config updates while preserving active API keys (avoiding placeholder overrides)
    merge_cmd = (
        "python3 -c \""
        "import json, os; "
        "old_path = '/home/clawuser/.openclaw/openclaw.json'; "
        "new_path = '/root/deploy/configs/openclaw.json'; "
        "old_env = json.load(open(old_path))['env'] if os.path.exists(old_path) else {}; "
        "new_config = json.load(open(new_path)); "
        "if old_env: new_config['env'].update({k: v for k, v in old_env.items() if 'YOUR_' not in v}); "
        "json.dump(new_config, open(old_path, 'w'), indent=2);"
        "\""
    )
    run_cmd(merge_cmd)
    run_cmd("chown clawuser:clawuser /home/clawuser/.openclaw/openclaw.json")
    run_cmd("chmod 600 /home/clawuser/.openclaw/openclaw.json")

    
    # 5. Install requests and python-multipart in FastAPI's python venv
    print("\n--- Installing Python Dependencies (requests, python-multipart) ---")
    run_cmd("/opt/dermaart-portal/venv/bin/pip install requests python-multipart")
    
    # 6. Restart portal backend service and openclaw gateway service
    print("\n--- Restarting Portal Backend & OpenClaw Gateway Services ---")
    run_cmd("systemctl restart dermaart-portal")
    run_cmd("systemctl restart openclaw")
    
    # Check status of service
    run_cmd("systemctl status dermaart-portal --no-pager -l")
    
    ssh.close()
    print("\n=== QUICK DEPLOYMENT COMPLETED SUCCESSFUL ===")

if __name__ == "__main__":
    deploy()
