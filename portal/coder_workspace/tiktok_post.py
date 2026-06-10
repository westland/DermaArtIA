#!/usr/bin/env python3
"""
TikTok Direct Video publishing tool for DERMA ART MedSpa.
Uses the TikTok Content Posting API (v2) to publish videos.

NOTE: TikTok API requires the video to be publicly hosted via URL to pull from,
      or initialized and uploaded in chunks.
TIP: Upload the video to WordPress first using `wordpress_update.py` and pass the URL!
"""

import sys
import os
import argparse
import requests
import json

def main():
    parser = argparse.ArgumentParser(description="Publish videos to TikTok Business / Creator accounts.")
    parser.add_argument("--access-token", help="TikTok Creator Access Token")
    parser.add_argument("--media-url", required=True, help="Publicly accessible URL of the video (.mp4/.mov)")
    parser.add_argument("--caption", default="", help="Video caption (title)")
    parser.add_argument("--dry-run", action="store_true", help="Simulate execution without calling APIs")
    
    args = parser.parse_args()
    
    access_token = args.access_token or os.environ.get("TIKTOK_ACCESS_TOKEN")
    
    if not access_token:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        creds_path = os.path.join(script_dir, "publishing_credentials.json")
        if os.path.exists(creds_path):
            try:
                with open(creds_path, "r", encoding="utf-8") as f:
                    creds = json.load(f)
                    tiktok_creds = creds.get("tiktok", {})
                    access_token = access_token or tiktok_creds.get("tiktok_access_token")
            except Exception as e:
                print(f"Warning: Failed to load credentials from {creds_path}: {e}", file=sys.stderr)
                
    caption = args.caption
    media_url = args.media_url
    
    if args.dry_run:
        print("=== DRY RUN SIMULATION ===")
        print(f"TikTok Config    : {'CONFIGURED' if access_token else 'NOT_CONFIGURED'}")
        print(f"Video Source URL : {media_url}")
        print(f"Caption (Title)  : {caption}")
        print("Simulation completed successfully. No remote requests made to TikTok API.")
        sys.exit(0)
        
    if not access_token:
        print("ERROR: TikTok Access Token is required.", file=sys.stderr)
        print("Provide it via arguments, environment variables, or save it in the portal Integrations page.", file=sys.stderr)
        sys.exit(1)
        
    url = "https://open.tiktokapis.com/v2/post/publish/video/init/"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=UTF-8"
    }
    
    payload = {
        "post_info": {
            "title": caption,
            "privacy_level": "PUBLIC_TO_EVERYONE",
            "disable_duet": False,
            "disable_stitch": False,
            "disable_comment": False,
            "video_cover_timestamp_ms": 1000
        },
        "source_info": {
            "source": "PULL_FROM_URL",
            "video_url": media_url
        }
    }
    
    print(f"Initializing TikTok publication (PULL_FROM_URL) for {media_url}...")
    try:
        res = requests.post(url, headers=headers, json=payload, timeout=20)
        res_data = res.json()
        
        # TikTok API v2 returns error code in 'error' key or response status
        if res.status_code == 200 and res_data.get("data", {}).get("publish_id"):
            publish_id = res_data["data"]["publish_id"]
            print("SUCCESS: Video posting initialized successfully on TikTok!")
            print(f"TikTok Publish ID: {publish_id}")
        else:
            print(f"ERROR: TikTok publication failed ({res.status_code}): {res.text}", file=sys.stderr)
            sys.exit(1)
            
    except Exception as e:
        print(f"ERROR: Connection failed: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
