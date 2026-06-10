#!/usr/bin/env python3
"""
Facebook Page publishing tool for DERMA ART MedSpa.
Uses the Facebook Graph API to post updates, photos, and videos to a Facebook Page.
"""

import sys
import os
import argparse
import requests
import json

def main():
    parser = argparse.ArgumentParser(description="Post updates, images, or videos to Facebook Page.")
    parser.add_argument("--access-token", help="Facebook Page Access Token")
    parser.add_argument("--page-id", help="Facebook Page ID")
    parser.add_argument("--media-url", help="Publicly accessible URL of the image or video")
    parser.add_argument("--file", help="Path to local image or video file to upload")
    parser.add_argument("--is-video", action="store_true", help="Set this flag if posting a video")
    parser.add_argument("--caption", default="", help="Post caption or message")
    parser.add_argument("--dry-run", action="store_true", help="Simulate execution without calling APIs")
    
    args = parser.parse_args()
    
    access_token = args.access_token or os.environ.get("FB_ACCESS_TOKEN")
    page_id = args.page_id or os.environ.get("FB_PAGE_ID")
    
    if not (access_token and page_id):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        creds_path = os.path.join(script_dir, "publishing_credentials.json")
        if os.path.exists(creds_path):
            try:
                with open(creds_path, "r", encoding="utf-8") as f:
                    creds = json.load(f)
                    fb_creds = creds.get("facebook", {})
                    access_token = access_token or fb_creds.get("fb_access_token")
                    page_id = page_id or fb_creds.get("fb_page_id")
            except Exception as e:
                print(f"Warning: Failed to load credentials from {creds_path}: {e}", file=sys.stderr)
                
    caption = args.caption
    media_url = args.media_url
    local_file = args.file
    
    if args.dry_run:
        print("=== DRY RUN SIMULATION ===")
        print(f"Facebook Page ID : {page_id or 'NOT_CONFIGURED'}")
        print(f"Media URL        : {media_url or 'NONE'}")
        print(f"Local File       : {local_file or 'NONE'}")
        print(f"Is Video         : {args.is_video}")
        print(f"Caption/Message  : {caption}")
        print("Simulation completed successfully. No remote requests made.")
        sys.exit(0)
        
    if not (access_token and page_id):
        print("ERROR: Page Access Token and Page ID are required.", file=sys.stderr)
        print("Provide them via arguments, environment variables, or save them in the portal Integrations page.", file=sys.stderr)
        sys.exit(1)
        
    # Determine post type and make request
    # 1. Video post
    if args.is_video:
        url = f"https://graph.facebook.com/v19.0/{page_id}/videos"
        payload = {"access_token": access_token, "description": caption}
        
        if local_file:
            if not os.path.exists(local_file):
                print(f"ERROR: Local file does not exist: {local_file}", file=sys.stderr)
                sys.exit(1)
            print(f"Uploading local video file {local_file} to page {page_id}...")
            try:
                with open(local_file, "rb") as f:
                    files = {"source": f}
                    res = requests.post(url, data=payload, files=files, timeout=60)
            except Exception as e:
                print(f"ERROR: Video upload failed: {e}", file=sys.stderr)
                sys.exit(1)
        elif media_url:
            print(f"Publishing video from URL {media_url} to page {page_id}...")
            payload["file_url"] = media_url
            try:
                res = requests.post(url, data=payload, timeout=30)
            except Exception as e:
                print(f"ERROR: Video posting failed: {e}", file=sys.stderr)
                sys.exit(1)
        else:
            print("ERROR: Either --media-url or --file is required for video posting.", file=sys.stderr)
            sys.exit(1)
            
    # 2. Image post
    elif media_url or local_file:
        url = f"https://graph.facebook.com/v19.0/{page_id}/photos"
        payload = {"access_token": access_token, "caption": caption}
        
        if local_file:
            if not os.path.exists(local_file):
                print(f"ERROR: Local file does not exist: {local_file}", file=sys.stderr)
                sys.exit(1)
            print(f"Uploading local image file {local_file} to page {page_id}...")
            try:
                with open(local_file, "rb") as f:
                    files = {"source": f}
                    res = requests.post(url, data=payload, files=files, timeout=30)
            except Exception as e:
                print(f"ERROR: Image upload failed: {e}", file=sys.stderr)
                sys.exit(1)
        else:
            print(f"Publishing photo from URL {media_url} to page {page_id}...")
            payload["url"] = media_url
            try:
                res = requests.post(url, data=payload, timeout=30)
            except Exception as e:
                print(f"ERROR: Image posting failed: {e}", file=sys.stderr)
                sys.exit(1)
                
    # 3. Simple text post
    else:
        if not caption:
            print("ERROR: Caption/message is required for text posts.", file=sys.stderr)
            sys.exit(1)
        url = f"https://graph.facebook.com/v19.0/{page_id}/feed"
        payload = {"access_token": access_token, "message": caption}
        print(f"Publishing text update to page {page_id}...")
        try:
            res = requests.post(url, data=payload, timeout=20)
        except Exception as e:
            print(f"ERROR: Feed posting failed: {e}", file=sys.stderr)
            sys.exit(1)
            
    # Parse API response
    try:
        res_data = res.json()
        if res.status_code == 200:
            post_id = res_data.get("id") or res_data.get("post_id")
            print("SUCCESS: Published successfully on Facebook!")
            print(f"Facebook Post ID: {post_id}")
        else:
            print(f"ERROR: Failed to publish ({res.status_code}): {res.text}", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"ERROR: Failed to parse response: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
