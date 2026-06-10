#!/usr/bin/env python3
"""
Instagram Business Page publishing tool for DERMA ART MedSpa.
Uses the Facebook Graph API (Instagram Graph API) to post images and videos.

NOTE: Instagram API requires media files to be publicly accessible via URL.
TIP: You can upload media to WordPress first using `wordpress_update.py` and 
     pass the uploaded media source URL to this script!
"""

import sys
import os
import argparse
import requests
import json
import time

def main():
    parser = argparse.ArgumentParser(description="Post images/videos to Instagram Business.")
    parser.add_argument("--access-token", help="Instagram/Facebook Page Access Token")
    parser.add_argument("--instagram-id", help="Instagram Business Account ID")
    parser.add_argument("--media-url", help="Publicly accessible URL of the image or video")
    parser.add_argument("--is-video", action="store_true", help="Set this flag if posting a video")
    parser.add_argument("--caption", default="", help="Post caption")
    parser.add_argument("--dry-run", action="store_true", help="Simulate execution without calling APIs")
    
    args = parser.parse_args()
    
    access_token = args.access_token or os.environ.get("IG_ACCESS_TOKEN")
    instagram_id = args.instagram_id or os.environ.get("IG_ACCOUNT_ID")
    
    if not (access_token and instagram_id):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        creds_path = os.path.join(script_dir, "publishing_credentials.json")
        if os.path.exists(creds_path):
            try:
                with open(creds_path, "r", encoding="utf-8") as f:
                    creds = json.load(f)
                    ig_creds = creds.get("instagram", {})
                    access_token = access_token or ig_creds.get("ig_access_token")
                    instagram_id = instagram_id or ig_creds.get("ig_account_id")
            except Exception as e:
                print(f"Warning: Failed to load credentials from {creds_path}: {e}", file=sys.stderr)
                
    media_url = args.media_url
    caption = args.caption
    
    if args.dry_run:
        print("=== DRY RUN SIMULATION ===")
        print(f"Instagram ID: {instagram_id or 'NOT_CONFIGURED'}")
        print(f"Media URL   : {media_url or 'NOT_PROVIDED'}")
        print(f"Is Video    : {args.is_video}")
        print(f"Caption     : {caption}")
        print("Simulation completed successfully. No remote requests made.")
        sys.exit(0)
        
    if not (access_token and instagram_id and media_url):
        print("ERROR: Access Token, Instagram ID, and Media URL are required.", file=sys.stderr)
        print("Provide them via arguments, environment variables, or save them in the portal Integrations page.", file=sys.stderr)
        print("\nNote: Instagram API requires files to be hosted on a public URL.", file=sys.stderr)
        print("Tip: Upload the file to WordPress first, then use the returned URL.", file=sys.stderr)
        sys.exit(1)
        
    # Step 1: Create Media Container
    container_url = f"https://graph.facebook.com/v19.0/{instagram_id}/media"
    
    payload = {
        "access_token": access_token,
        "caption": caption
    }
    
    if args.is_video:
        payload["media_type"] = "VIDEO"
        payload["video_url"] = media_url
    else:
        payload["image_url"] = media_url
        
    print(f"Creating media container at {container_url}...")
    try:
        response = requests.post(container_url, data=payload, timeout=20)
        res_data = response.json()
        
        if response.status_code != 200:
            print(f"ERROR: Failed to create container ({response.status_code}): {response.text}", file=sys.stderr)
            sys.exit(1)
            
        creation_id = res_data.get("id")
        print(f"SUCCESS: Container created with ID: {creation_id}")
    except Exception as e:
        print(f"ERROR: Connection error during container creation: {e}", file=sys.stderr)
        sys.exit(1)
        
    # Step 1.5: If video, wait for container status to be "FINISHED"
    if args.is_video:
        print("Checking video container status...")
        status_url = f"https://graph.facebook.com/v19.0/{creation_id}"
        params = {
            "fields": "status_code",
            "access_token": access_token
        }
        
        max_retries = 12
        for i in range(max_retries):
            try:
                time.sleep(10) # Wait 10s between checks
                status_res = requests.get(status_url, params=params, timeout=10)
                status_data = status_res.json()
                status = status_data.get("status_code")
                print(f"Status check {i+1}: {status}")
                if status == "FINISHED":
                    break
                elif status == "ERROR":
                    print("ERROR: Container status returned error.", file=sys.stderr)
                    sys.exit(1)
            except Exception as e:
                print(f"WARNING: Status check failed: {e}", file=sys.stderr)
        else:
            print("ERROR: Video processing timed out.", file=sys.stderr)
            sys.exit(1)

    # Step 2: Publish the Container
    publish_url = f"https://graph.facebook.com/v19.0/{instagram_id}/media_publish"
    publish_payload = {
        "creation_id": creation_id,
        "access_token": access_token
    }
    
    print(f"Publishing container to Instagram grid at {publish_url}...")
    try:
        response = requests.post(publish_url, data=publish_payload, timeout=20)
        res_data = response.json()
        
        if response.status_code == 200:
            post_id = res_data.get("id")
            print("SUCCESS: Post published successfully on Instagram!")
            print(f"Instagram Post ID: {post_id}")
        else:
            print(f"ERROR: Failed to publish post ({response.status_code}): {response.text}", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"ERROR: Connection error during publishing: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
