# SKILL: media-publishing

## Identity
- **Sender name**: Coder — Dev Agent
- **Embed color**: 9069567  *(indigo #8A63FF)*
- **Footer**: Derma Art MedSpa · Coder

## Purpose

Generate, edit, and describe media files using Google Generative AI (Imagen and Veo), and publish them to the MedSpa's WordPress web pages and Instagram accounts.

---

## Part 1: Media Generation, Editing & Description

OpenClaw supports native image and video capabilities on the server using Google provider endpoints. You can run these commands from the terminal to create and describe assets.

### 1. Image Generation (Google Imagen 3)
Generate pictures (JPG, PNG, WebP) in standard aspect ratios:
```bash
openclaw infer image generate --model google/gemini-3.1-flash-image-preview --prompt "Close up of smooth skin on a woman's face, warm lighting, elegant Scottsdale MedSpa setting" --output skin_smooth.jpg
```
- Available models: `google/gemini-3.1-flash-image-preview` and `google/gemini-3-pro-image-preview`.
- Parameters: `--aspect-ratio` (e.g., `1:1`, `16:9`, `9:16`), `--output`, `--prompt`.

### 2. Video Generation (Google Veo)
Generate videos (MP4) in standard formats:
```bash
openclaw infer video generate --model google/veo-3.1-fast-generate-preview --prompt "A subtle pan of Scottsdale Scottsdale luxury MedSpa interior with white orchids and cream walls" --output interior_pan.mp4
```
- Available models: `google/veo-3.1-fast-generate-preview`.
- Parameters: `--duration` (e.g., `4`, `6`, `8`), `--output`, `--prompt`.

### 3. Image Editing (Modify Uploaded Media)
Modify or edit an existing image based on text instructions:
```bash
openclaw infer image edit --file original.jpg --prompt "Make the lighting brighter and add a soft pink flower in the background" --output edited.jpg
```

### 4. Media Description & Understanding
Describe any image or video file:
```bash
openclaw infer image describe --file skin_smooth.jpg --prompt "Describe the skin quality and lighting of this photo"
openclaw infer video describe --file interior_pan.mp4 --prompt "Describe the scenery and motion of this video"
```

---

## Part 2: WordPress Web Page Publishing

Use the pre-configured Python helper script `wordpress_update.py` in your workspace to manage WordPress content.

### Step 1: Upload Media to WordPress
Before inserting media into pages, upload it to WordPress and capture the returned public URL and Media ID:
```bash
python wordpress_update.py --action upload-media --file skin_smooth.jpg
```
- Outputs JSON with the `"id"` and `"url"` (which you can use for featured images or Instagram URL).

### Step 2: Update Page Content or Create Posts
Update a specific page (e.g., Homepage section) by replacing its content:
```bash
python wordpress_update.py --action update-page --page-id 42 --title " Scottsdale Direct Access medspa" --content "<h3>Direct Access Distinction</h3><p>Consult with Sumar Kasik, RN directly. No rotating staff.</p>" --media-id [Uploaded_Media_ID]
```
- Create blog posts:
```bash
python wordpress_update.py --action create-post --title "New Fillers Treatment Arizona" --content "<p>Read about our Scottsdale medspa options...</p>" --media-id [Media_ID]
```

*Note: The script automatically checks environment variables `WP_URL`, `WP_USERNAME`, and `WP_PASSWORD` or accepts command arguments.*

---

## Part 3: Instagram Publishing

To publish to the business's Instagram Feed, use `instagram_post.py`. Because the Instagram API requires the file to be hosted on a public URL, upload it to WordPress first.

### Publish Post (Image or Video)
```bash
# Get WordPress source URL from WordPress upload step, then run:
python instagram_post.py --media-url "https://wp-site.com/uploads/skin_smooth.jpg" --caption "Beautiful natural fillers at Derma Art MedSpa Scottsdale. Book direct with Sumar Kasik, RN. ✨ # ScottsdaleMedspa #Fillers"
```
For videos, add the `--is-video` flag:
```bash
python instagram_post.py --is-video --media-url "https://wp-site.com/uploads/interior_pan.mp4" --caption "Our peaceful space. # ScottsdaleMedspa"
```

*Note: The script reads environment variables `IG_ACCESS_TOKEN` and `IG_ACCOUNT_ID` or accepts arguments. To test code connections without submitting to Instagram, use the `--dry-run` flag.*
*Warning: The Instagram API strictly requires images to be in JPEG format (PNG images will fail to post). If you have a PNG image in memory, you MUST convert it to JPEG using Python's PIL library (e.g. `Image.open('img.png').convert('RGB').save('img.jpg')`) before uploading it to WordPress and publishing to Instagram.*

---

## Part 4: Facebook Publishing

Use `facebook_post.py` to publish messages, images, and videos to the Facebook Page feed. Like Instagram, you can use WordPress-hosted URLs, or upload a local file directly.

### 1. Publish text post
```bash
python facebook_post.py --caption "Schedule direct with Sumar Kasik, RN at Derma Art MedSpa. Experience boutique beauty. ✨"
```

### 2. Publish photo (local file or URL)
```bash
python facebook_post.py --file "skin_smooth.jpg" --caption "Beautiful Scottsdale MedSpa treatments."
# Or using URL
python facebook_post.py --media-url "https://wp-site.com/uploads/skin_smooth.jpg" --caption "Beautiful Scottsdale MedSpa treatments."
```

### 3. Publish video
Add the `--is-video` flag:
```bash
python facebook_post.py --is-video --file "interior_pan.mp4" --caption "Take a virtual tour of our boutique MedSpa."
```

*Note: The script reads environment variables `FB_ACCESS_TOKEN` and `FB_PAGE_ID` or accepts arguments. It supports testing via `--dry-run`.*

---

## Part 5: TikTok Publishing

Use `tiktok_post.py` to publish video posts to the TikTok account. TikTok requires video files to be hosted on a public URL so it can pull the media.

### Publish Video
```bash
# Upload the video to WordPress first to obtain the URL, then run:
python tiktok_post.py --media-url "https://wp-site.com/uploads/interior_pan.mp4" --caption "Boutique MedSpa vibes in Scottsdale. ✨ #scottsdalemedspa #medspa"
```

*Note: The script reads environment variables `TIKTOK_ACCESS_TOKEN` or accepts arguments. It supports testing via `--dry-run`.*

---

## Part 6: Credentials & Sharing Permissions

All publishing scripts automatically load the required credentials from `publishing_credentials.json` inside your local workspace. 

- You do NOT need to specify access tokens, usernames, passwords, or account IDs as arguments when calling these scripts, unless you wish to override them.
- If you run a script and receive a "missing credentials" or "access denied" error, it means the user has not shared the credentials for that platform with you yet in the portal's **Integrations & Auth** dashboard tab. In this case, report the issue to the user.
- Always use the `--dry-run` flag if you want to verify your command parameters and caption text formatting without executing the actual remote publishing API calls.

