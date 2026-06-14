# MEMORY — Coder's Initial State (DERMA ART MedSpa)

## Project Profile

*   **Objective**: Develop and maintain the high-end, responsive, minimalist homepage for DERMA ART MedSpa.
*   **Production Server**: Ubuntu 24.04 server on DigitalOcean (`157.230.221.89`).
*   **Bespoke Agent Server**: Ubuntu 24.04 server on DigitalOcean (`174.138.46.163`), hosting the OpenClaw REST gateway and FastAPI web portal.

## Web Server Stack & Directory Structure

*   **Client Website Location**: `/var/www/dermaartmedspa`
*   **Web Server Configuration**: Nginx site block `/etc/nginx/sites-available/dermaartmedspa`
*   **Local Repository Path**: `c:\Users\westl\Desktop\SUMAR NEW` (local workspace containing index.html, style.css, app.js, and assets).
*   **Release Management**: Do not commit release installation markdown files (e.g., `RELEASE_v*_INSTALLATION.md`) directly to the repository file list (center list) to avoid clutter. Consolidate all release memos under the GitHub Releases sidebar header on the far right menu.

## Design Constraints Checklist

*   **Backgrounds**: stark white (`#ffffff`) or pale tranquil cream (`#faf9f6`).
*   **Borders**: fine, thin border lines (`1px solid #eaeaea` or similar).
*   **Fonts**: Outfit (sans-serif headings) and Fira Code (monospaced accents).
*   **Hero Grid**: Uncluttered single photo layout.
*   **Financing Section**: Cherry and CareCredit logos, small and clean.
*   **Consultation Suite**: In-person booking + SMS virtual photo consult line (`480.630.7542`).

## Active Tasks

*   `[ ]` Support the deployment of the FastAPI agent portal on `174.138.46.163` by verifying script uploads.
*   `[ ]` Audit the Nginx configuration on server `157.230.221.89` to ensure browser caching of static images and fonts is active.
*   `[ ]` Cooperate with Writer to format the text blocks of the specialized menu.
