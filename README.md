# KINTA

KINTA is a lightweight full-stack agricultural leasing marketplace prototype built with only Python's standard library plus HTML, CSS, and vanilla JavaScript.

## What It Includes

- Public landing page
- Dedicated marketplace page for land listings and tenant farmers
- User account page for registration and login
- Admin operations dashboard
- Land detail and tenant detail pages
- Match request workflow
- SQLite-backed persistence
- Health endpoint for deployment checks

## Local Run

```powershell
py server.py
```

Open:

- `http://127.0.0.1:3000/`
- `http://127.0.0.1:3000/marketplace.html`
- `http://127.0.0.1:3000/account.html`
- `http://127.0.0.1:3000/admin.html`
- `http://127.0.0.1:3000/android/index.html`

## Publish As A Public Website

This project is already structured to run as a single web service, so the easiest way to make it public is:

1. Put the code in a GitHub repository.
2. Connect that repo to Render.
3. Let Render build from the included `Dockerfile` and `render.yaml`.

### 1. Install Git

If `git` is not working in your terminal yet, install Git for Windows first:

- Download Git for Windows: `https://git-scm.com/download/win`
- After installing, reopen your terminal and verify with:

```powershell
git --version
```

### 2. Initialize The Repo

From the project folder:

```powershell
cd C:\Users\mallareddy\KINTAAAAA
git init
git add .
git commit -m "Initial KINTA website"
```

### 3. Push To GitHub

Create an empty GitHub repository named `kinta`, then run:

```powershell
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kinta.git
git push -u origin main
```

### 4. Deploy On Render

- Sign in at `https://render.com`
- Click `New +` -> `Blueprint`
- Connect your GitHub repo
- Select the `kinta` repository
- Render will detect `render.yaml` and create the web service automatically

Your public site will then be available at a Render URL like:

```text
https://kinta.onrender.com
```

### 5. Important Hosting Note

KINTA uses SQLite. For local development it stores data in `kinta.db`, and for Render the included `render.yaml` mounts a persistent disk and stores the database at:

```text
/var/data/kinta.db
```

That means your inquiries, users, and listings can survive redeploys on Render.

## What To Commit

The `.gitignore` is set up to avoid committing:

- the local SQLite database
- Android build output
- generated APK files
- IDE and cache files

## Android App

There is now a build-ready Android wrapper project in `android-app/`.

- Open `android-app/` in Android Studio to build an APK.
- The app loads the existing mobile KINTA web UI inside a native `WebView`.
- Default development URL inside the app: `http://10.0.2.2:3000/android/index.html`
- On a real phone, change that URL in the app settings to your computer's LAN IP or a deployed HTTPS URL.

See `android-app/README.md` for build details.

## Demo Credentials

Admin:

- `admin@kinta.in`
- `kinta123`

Users:

- `landowner@kinta.in`
- `tenant@kinta.in`
- `partner@kinta.in`
- password for all demo users: `kinta123`

## Health Check

```text
GET /api/health
```

Returns a JSON payload with service status and a timestamp.

## Security Note

Passwords are stored using salted PBKDF2-SHA256 hashes. Older SHA-256-only demo hashes are migrated automatically the next time those users log in.

## Docker

Build:

```powershell
docker build -t kinta .
```

Run:

```powershell
docker run -p 3000:3000 kinta
```

## Files

- `server.py`: app entrypoint
- `backend/data.py`: database setup, seed data, auth hashing helpers
- `backend/handler.py`: request routing and API logic
- `public/`: frontend pages, scripts, styles, and assets
- `render.yaml`: Render blueprint for public deployment from GitHub
