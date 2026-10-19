# Live Cloud Deployment Guide: AI Continuous Authentication

This guide provides step-by-step instructions to deploy your complete application to the internet with **free cloud hosting**.

---

## Architecture of the Live Deployment

Your project is built with **Unified Container Architecture**:
- The **React frontend** is built into static HTML/CSS/JS bundles.
- The **FastAPI backend** serves the API routes (`/api/v1/...`), the interactive API documentation (`/docs`), and the React dashboard directly from a single server.
- **Benefits**:
  - **Zero CORS issues**: Frontend and backend share the exact same origin domain.
  - **One-click deployment**: You only need to deploy **one** service instead of managing two separate servers.
  - **Free tier compatible**: Works within the free plans of Render, Railway, Fly.io, and Hugging Face Spaces.

---

## Method 1: Deploy to Render.com (Recommended — 100% Free)

[Render](https://render.com) is the simplest and most reliable free platform for Python + React full-stack applications.

### Step 1: Push your Code to GitHub
1. Create a new repository on [GitHub](https://github.com) named `ai-continuous-auth` (leave it public or private).
2. In your local terminal inside `C:\Users\HP\.gemini\antigravity\scratch\ai-continuous-auth`, run:
   ```bash
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ai-continuous-auth.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com) and sign in with your GitHub account.
2. In your Render dashboard, click **New +** $\to$ **Web Service**.
3. Select **"Build and deploy from a Git repository"** and choose your `ai-continuous-auth` repository.
4. Render will automatically detect the `Dockerfile`:
   - **Name**: `ai-continuous-auth`
   - **Region**: Choose the closest region (e.g. Frankfurt, Oregon, Singapore).
   - **Instance Type**: **Free**.
5. Under **Environment Variables**, ensure the following are set:
   - `PORT`: `8000`
   - `SECRET_KEY`: (Enter any random string, e.g. `academic-super-secure-jwt-secret-key-2026`)
   - `DATABASE_URL`: `sqlite:///./continuous_auth.db`
6. Click **Deploy Web Service**.

Render will now build your container and deploy the app! Once the build completes, you will receive a free live HTTPS URL:
`https://ai-continuous-auth-xxxx.onrender.com`

---

## Method 2: Deploy to Railway.app

[Railway](https://railway.app) is another modern platform that deploys Docker containers in seconds.

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project** $\to$ **Deploy from GitHub repo**.
3. Select your `ai-continuous-auth` repository.
4. Railway will automatically detect the `Dockerfile` and start building.
5. In the project settings, click **Generate Domain** under Networking.
6. Your live app is immediately accessible at `https://ai-continuous-auth-production.up.railway.app`.

---

## Method 3: Deploy to Hugging Face Spaces (Ideal for Academic AI Portfolios)

If you are presenting this project to a professor or university evaluation board, hosting it on **Hugging Face Spaces** gives it strong academic credibility.

1. Go to [huggingface.co](https://huggingface.co) and sign in.
2. Click **New Space**.
3. Name your space (e.g. `ai-continuous-authentication`), select **Docker** as the Space SDK, and choose **Blank**.
4. Clone the Hugging Face space repository locally or add it as a git remote:
   ```bash
   git remote add hf https://huggingface.co/spaces/YOUR_USERNAME/ai-continuous-authentication
   git push hf main
   ```
5. Hugging Face will build the container and provide an interactive live demo URL (e.g. `https://huggingface.co/spaces/username/ai-continuous-authentication`).

---

## Method 4: Split Deployment (Vercel Frontend + Render Backend)

If you prefer to separate the frontend and backend onto dedicated specialized hosts:

### 1. Deploy Backend on Render
- Follow Method 1, but set the root directory to `backend/`.
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- Your backend will be at: `https://your-api.onrender.com`.

### 2. Deploy Frontend on Vercel
- Go to [vercel.com](https://vercel.com) and import the `frontend/` folder.
- Framework Preset: **Vite**.
- Build Command: `npm run build`.
- Output Directory: `dist`.
- Under **Environment Variables**, add:
  ```
  VITE_API_BASE_URL=https://your-api.onrender.com/api/v1
  ```
- Click **Deploy**. Your frontend is live at `https://your-project.vercel.app`.

---

## Production Security Checklist
- [x] Passwords are encrypted using high-entropy `bcrypt` salts.
- [x] JWT tokens are digitally signed with `HS256` and an environment-configurable secret key.
- [x] Behavioral biometrics are strictly zero-content (no key characters, form fields, or passwords logged).
- [x] Dynamic risk policy restricts high-value actions via HTTP 403.
- [x] RFC 6238 TOTP MFA prevents unauthorized takeover recovery.
