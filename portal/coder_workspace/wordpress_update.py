#!/usr/bin/env python3
"""
WordPress page and media update tool for DERMA ART MedSpa.
Uses WordPress REST API v2 to upload media and create/update pages/posts.
"""

import sys
import os
import argparse
import requests
import json
import base64
import mimetypes

def main():
    parser = argparse.ArgumentParser(description="Update WordPress site content.")
    parser.add_argument("--url", help="WordPress Site Base URL (e.g. https://dermaartmedspa.com)")
    parser.add_argument("--username", help="WordPress Username")
    parser.add_argument("--password", help="WordPress Application Password")
    parser.add_argument("--action", choices=["upload-media", "update-page", "create-post"], required=True)
    parser.add_argument("--file", help="Path to image or video file for upload-media")
    parser.add_argument("--page-id", type=int, help="WordPress Page ID to update")
    parser.add_argument("--title", help="Title for the page/post")
    parser.add_argument("--content", help="HTML content for the page/post")
    parser.add_argument("--media-id", type=int, help="Associated media ID (optional)")
    parser.add_argument("--status", default="publish", choices=["publish", "draft", "pending"])
    
    args = parser.parse_args()
    
    # Load from environment variables as fallback
    wp_url = args.url or os.environ.get("WP_URL")
    wp_user = args.username or os.environ.get("WP_USERNAME")
    wp_pass = args.password or os.environ.get("WP_PASSWORD")
    
    if not (wp_url and wp_user and wp_pass):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        creds_path = os.path.join(script_dir, "publishing_credentials.json")
        if os.path.exists(creds_path):
            try:
                with open(creds_path, "r", encoding="utf-8") as f:
                    creds = json.load(f)
                    wp_creds = creds.get("wordpress", {})
                    wp_url = wp_url or wp_creds.get("wp_url")
                    wp_user = wp_user or wp_creds.get("wp_username")
                    wp_pass = wp_pass or wp_creds.get("wp_password")
            except Exception as e:
                print(f"Warning: Failed to load credentials from {creds_path}: {e}", file=sys.stderr)
                
    if not (wp_url and wp_user and wp_pass):
        print("ERROR: WordPress URL, Username, and Password are required.", file=sys.stderr)
        print("Provide them via arguments, environment variables, or save them in the portal Integrations page.", file=sys.stderr)
        sys.exit(1)
        
    # Standardize URL
    wp_url = wp_url.rstrip('/')
    
    # Configure auth headers
    token = base64.b64encode(f"{wp_user}:{wp_pass}".encode("utf-8")).decode("utf-8")
    headers = {
        "Authorization": f"Basic {token}"
    }
    
    if args.action == "upload-media":
        if not args.file or not os.path.exists(args.file):
            print(f"ERROR: File path required and must exist for upload-media: {args.file}", file=sys.stderr)
            sys.exit(1)
            
        filename = os.path.basename(args.file)
        mime_type, _ = mimetypes.guess_type(args.file)
        
        # Explicit override mapping for common formats to ensure reliability (e.g. PNG files)
        ext = os.path.splitext(filename)[1].lower()
        if ext == ".png":
            mime_type = "image/png"
        elif ext in [".jpg", ".jpeg"]:
            mime_type = "image/jpeg"
        elif ext == ".gif":
            mime_type = "image/gif"
        elif ext == ".webp":
            mime_type = "image/webp"
        elif ext == ".mp4":
            mime_type = "video/mp4"
        elif ext in [".mov", ".avi", ".webm"]:
            mime_type = f"video/{ext[1:]}"
            
        if not mime_type:
            mime_type = "application/octet-stream"
            
        upload_url = f"{wp_url}/wp-json/wp/v2/media"
        
        print(f"Uploading {filename} ({mime_type}) to {upload_url}...")
        
        file_headers = headers.copy()
        file_headers.update({
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": mime_type
        })
        
        try:
            with open(args.file, "rb") as f:
                response = requests.post(upload_url, headers=file_headers, data=f, timeout=60)
                
            if response.status_code in [200, 201]:
                data = response.json()
                print("SUCCESS: Media uploaded successfully!")
                print(json.dumps({
                    "id": data.get("id"),
                    "url": data.get("source_url"),
                    "link": data.get("link")
                }, indent=2))
            else:
                print(f"ERROR: Failed to upload media ({response.status_code}): {response.text}", file=sys.stderr)
                sys.exit(1)
        except Exception as e:
            print(f"ERROR: Connection error: {e}", file=sys.stderr)
            sys.exit(1)
            
    elif args.action == "update-page":
        if not args.page_id:
            print("ERROR: Page ID required for update-page.", file=sys.stderr)
            sys.exit(1)
            
        page_url = f"{wp_url}/wp-json/wp/v2/pages/{args.page_id}"
        print(f"Updating WordPress Page ID {args.page_id} at {page_url}...")
        
        payload = {}
        if args.title:
            payload["title"] = args.title
        if args.content:
            payload["content"] = args.content
        if args.status:
            payload["status"] = args.status
        if args.media_id:
            payload["featured_media"] = args.media_id
            
        try:
            response = requests.post(page_url, headers=headers, json=payload, timeout=20)
            if response.status_code == 200:
                data = response.json()
                print("SUCCESS: Page updated successfully!")
                print(f"Link: {data.get('link')}")
            else:
                print(f"ERROR: Failed to update page ({response.status_code}): {response.text}", file=sys.stderr)
                sys.exit(1)
        except Exception as e:
            print(f"ERROR: Connection error: {e}", file=sys.stderr)
            sys.exit(1)

    elif args.action == "create-post":
        post_url = f"{wp_url}/wp-json/wp/v2/posts"
        print(f"Creating a new post at {post_url}...")
        
        payload = {
            "title": args.title or "New MedSpa Update",
            "content": args.content or "<p>Content coming soon.</p>",
            "status": args.status,
        }
        if args.media_id:
            payload["featured_media"] = args.media_id
            
        try:
            response = requests.post(post_url, headers=headers, json=payload, timeout=20)
            if response.status_code == 201:
                data = response.json()
                print("SUCCESS: Post created successfully!")
                print(f"Link: {data.get('link')}")
            else:
                print(f"ERROR: Failed to create post ({response.status_code}): {response.text}", file=sys.stderr)
                sys.exit(1)
        except Exception as e:
            print(f"ERROR: Connection error: {e}", file=sys.stderr)
            sys.exit(1)

if __name__ == "__main__":
    main()
