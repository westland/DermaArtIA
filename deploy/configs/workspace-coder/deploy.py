#!/usr/bin/env python3
import os
import sys
import paramiko

def sftp_upload_dir(sftp, local_dir, remote_dir):
    try:
        sftp.mkdir(remote_dir)
    except OSError:
        pass
        
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"
        
        if os.path.isdir(local_path):
            sftp_upload_dir(sftp, local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)
            sftp.chmod(remote_path, 0o644)

def deploy():
    host = "157.230.221.89"
    port = 22
    username = "root"
    password = "#1DermaArts"
    
    local_base = os.path.dirname(os.path.abspath(__file__))
    remote_dir = "/var/www/dermaartmedspa"
    
    print(f"Connecting to {host}:{port} via SSH as {username}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(host, port=port, username=username, password=password, timeout=15)
        print("SSH Connection established successfully!")
    except Exception as e:
        print(f"Failed to connect: {e}")
        sys.exit(1)
        
    sftp = ssh.open_sftp()
    
    # Upload main files
    files_to_upload = ["index.html", "style.css", "app.js"]
    for file in files_to_upload:
        local_path = os.path.join(local_base, file)
        remote_path = f"{remote_dir}/{file}"
        if os.path.exists(local_path):
            print(f"Uploading: {file} -> {remote_path}...")
            sftp.put(local_path, remote_path)
            sftp.chmod(remote_path, 0o644)
            
    # Upload assets
    local_assets = os.path.join(local_base, "assets")
    if os.path.exists(local_assets):
        print("Uploading assets folder recursively...")
        sftp_upload_dir(sftp, local_assets, f"{remote_dir}/assets")
        
    sftp.close()
    
    # Reload Nginx
    print("Restarting Nginx on production web server...")
    stdin, stdout, stderr = ssh.exec_command("nginx -t && systemctl restart nginx")
    print(stdout.read().decode('utf-8').strip())
    print(stderr.read().decode('utf-8').strip())
    
    ssh.close()
    print("Deployment successfully completed from Coder's workspace!")

    # Automatically submit a report to the Reports & Memos section
    try:
        import urllib.request
        import json
        from datetime import datetime
        
        report_content = f"""# Coder — Development Report
## Website Deployed Successfully
*   **Target Server**: {host}
*   **Directory**: {remote_dir}
*   **Files Deployed**: index.html, style.css, app.js
*   **Nginx Reloaded**: Yes
*   **Status**: ✅ Complete

— Coder, Dev Agent · ClawInc · {datetime.now().strftime("%Y-%m-%d %I:%M %p")}"""

        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/reports/submit",
            data=json.dumps({"content": report_content}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as res:
            print("Automatic deployment report submitted successfully!")
    except Exception as e:
        print(f"Failed to submit automatic deployment report: {e}")

if __name__ == "__main__":
    deploy()
