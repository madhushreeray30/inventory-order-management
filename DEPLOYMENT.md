# Deployment guide

Free-tier deployment: **Render** for the backend + PostgreSQL, **Vercel** for
the frontend, **Docker Hub** for the backend image.

> Note: Render's free web service sleeps after inactivity, so the first request
> after idle can take ~30–60s to wake up. That's expected on the free plan.

---

## 1. Push the code to GitHub

```bash
cd inventory-order-management
git init
git add .
git commit -m "Inventory & Order Management System"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

(If `git`/`gh` needs you to log in, run the login command in this terminal with
a leading `!`, e.g. `! gh auth login`.)

---

## 2. Backend + database on Render

Two options — the Blueprint is easiest.

**Option A — Blueprint (uses `render.yaml`):**
1. Render dashboard → **New → Blueprint** → select your GitHub repo.
2. Render reads `render.yaml` and creates the web service + free Postgres.
3. After the DB is created, set the `CORS_ORIGINS` env var on the backend
   service to your Vercel URL (you'll have it after step 3). Use a comma to
   list more than one origin.

**Option B — manual:**
1. **New → PostgreSQL** (free plan). Copy its **Internal Connection String**.
2. **New → Web Service** → your repo → Runtime **Docker**, root `backend/`.
3. Add env vars:
   - `DATABASE_URL` = the connection string from step 1
   - `CORS_ORIGINS` = your Vercel URL
4. Deploy. Health check path: `/health`.

The app creates its tables automatically on startup. To load sample data, open
the service **Shell** in Render and run `python seed.py`.

Your API will be at `https://<service>.onrender.com` (docs at `/docs`).

---

## 3. Frontend on Vercel

1. Vercel → **Add New → Project** → import the repo.
2. Set **Root Directory** to `frontend`.
3. Framework preset: **Vite** (build `npm run build`, output `dist`).
4. Add an environment variable:
   - `VITE_API_URL` = your Render backend URL (e.g. `https://<service>.onrender.com`)
5. Deploy. You'll get a URL like `https://<project>.vercel.app`.

Then go back to Render and make sure `CORS_ORIGINS` includes that Vercel URL,
and redeploy the backend.

---

## 4. Backend image on Docker Hub

```bash
docker build -t <dockerhub-user>/inventory-backend:latest ./backend
# log in if needed:  ! docker login
docker push <dockerhub-user>/inventory-backend:latest
```

Image link: `https://hub.docker.com/r/<dockerhub-user>/inventory-backend`

---

## 5. Verify

- Open the Vercel URL → Dashboard loads with totals.
- Add a product and a customer, place an order, confirm stock drops.
- Try ordering more than the available stock → you get a clear error.

Fill these into `README.md`:
- GitHub repo link
- Live frontend URL (Vercel)
- Live backend URL (Render)
- Docker Hub image link
