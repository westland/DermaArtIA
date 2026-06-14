import os
import sys
import paramiko
import stat

# Set encoding to utf-8 for standard output and error to avoid codec errors on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def deploy():
    host = "157.230.221.89"
    port = 22
    username = "root"
    password = "#1DermaArts"
    
    # Resolve local_dir dynamically based on where the script is located
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if os.path.basename(current_dir) == "DermaArtIA":
        local_dir = os.path.dirname(current_dir)
    else:
        local_dir = current_dir
    remote_dir = "/var/www/dermaartmedspa"
    
    print(f"Connecting to {host}:{port} via SSH as {username}...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(host, port=port, username=username, password=password, timeout=15)
        print("SSH connection established successfully!")
    except Exception as e:
        print(f"Failed to connect as root: {e}")
        print("Attempting connection as 'ubuntu' user...")
        username = "ubuntu"
        try:
            ssh.connect(host, port=port, username=username, password=password, timeout=15)
            print("SSH connection established successfully as 'ubuntu'!")
        except Exception as e2:
            print(f"Failed to connect as 'ubuntu': {e2}")
            sys.exit(1)
            
    # Helper to run remote commands and print output
    def run_cmd(cmd):
        print(f"Running: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        exit_code = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8').strip()
        err = stderr.read().decode('utf-8').strip()
        if out:
            print(f"STDOUT:\n{out}")
        if err:
            print(f"STDERR:\n{err}")
        return exit_code, out, err

    # 1. Install Nginx if not installed
    print("\n--- Installing Nginx ---")
    run_cmd("sudo apt-get update")
    run_cmd("sudo apt-get install -y nginx")

    # 2. Prepare remote directory
    print("\n--- Preparing Remote Directory ---")
    # If root, sudo is optional but safe
    run_cmd(f"sudo mkdir -p {remote_dir}")
    run_cmd(f"sudo chown -R {username}:{username} {remote_dir}")
    run_cmd(f"sudo mkdir -p {remote_dir}/assets")
    
    # 3. SFTP Upload Files
    print("\n--- SFTP File Upload ---")
    sftp = ssh.open_sftp()
    
    # List of files to upload from base dir
    files_to_upload = ["index.html", "style.css", "app.js"]
    for file in files_to_upload:
        local_path = os.path.join(local_dir, file)
        remote_path = f"{remote_dir}/{file}"
        if os.path.exists(local_path):
            print(f"Uploading {file} -> {remote_path}...")
            sftp.put(local_path, remote_path)
            sftp.chmod(remote_path, 0o644)
            
    # Upload assets
    local_assets_dir = os.path.join(local_dir, "assets")
    if os.path.exists(local_assets_dir):
        for file in os.listdir(local_assets_dir):
            local_path = os.path.join(local_assets_dir, file)
            remote_path = f"{remote_dir}/assets/{file}"
            if os.path.isfile(local_path):
                print(f"Uploading assets/{file} -> {remote_path}...")
                sftp.put(local_path, remote_path)
                sftp.chmod(remote_path, 0o644)
                
    sftp.close()
    print("All files uploaded successfully!")

    # 3.5 Generate self-signed SSL certificate
    print("\n--- Generating Self-Signed SSL Certificate ---")
    run_cmd("sudo mkdir -p /etc/ssl/private /etc/ssl/certs")
    run_cmd(f'if [ ! -f /etc/ssl/private/dermaartmedspa.key ]; then sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/dermaartmedspa.key -out /etc/ssl/certs/dermaartmedspa.crt -subj "/C=US/ST=Arizona/L=Scottsdale/O=Derma Art MedSpa/CN={host}"; fi')

    # 4. Configure Nginx Server Block
    print("\n--- Configuring Nginx ---")
    nginx_config = f"""server {{
    listen 80;
    listen 443 ssl;
    server_name {host};

    ssl_certificate /etc/ssl/certs/dermaartmedspa.crt;
    ssl_certificate_key /etc/ssl/private/dermaartmedspa.key;

    root {remote_dir};
    index index.html;

    location / {{
        try_files $uri $uri/ =404;
    }}

    # Cache static assets
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|webp|svg)$ {{
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }}
}}
"""
    # Write config file locally first, then upload it
    local_nginx_config = os.path.join(local_dir, "nginx_config_temp")
    with open(local_nginx_config, "w") as f:
        f.write(nginx_config)
        
    sftp = ssh.open_sftp()
    # Upload to a temporary location first, then move it via sudo if needed
    remote_nginx_temp = "/tmp/dermaartmedspa_nginx"
    sftp.put(local_nginx_config, remote_nginx_temp)
    sftp.close()
    
    # Remove local temp config
    os.remove(local_nginx_config)
    
    # Move config to Nginx sites-available and link it
    run_cmd(f"sudo mv {remote_nginx_temp} /etc/nginx/sites-available/dermaartmedspa")
    run_cmd("sudo chmod 644 /etc/nginx/sites-available/dermaartmedspa")
    
    # Remove default Nginx site if it exists to avoid port 80 conflicts
    run_cmd("sudo rm -f /etc/nginx/sites-enabled/default")
    
    # Enable our site by symlink
    run_cmd("sudo ln -sf /etc/nginx/sites-available/dermaartmedspa /etc/nginx/sites-enabled/")
    
    # Test Nginx and restart
    exit_code, out, err = run_cmd("sudo nginx -t")
    if exit_code == 0:
        print("Nginx configuration check passed!")
        run_cmd("sudo systemctl restart nginx")
        print("\n=== DEPLOYMENT SUCCESSFUL ===")
        print(f"Your website is now live at: http://{host}")
    else:
        print("Nginx configuration check failed! Please review logs.")
        
    ssh.close()

if __name__ == "__main__":
    deploy()
