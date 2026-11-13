# CareConnect — Hospital Appointment & Care Management

A full-stack React + Express + MongoDB Atlas application with separate Patient, Doctor and Hospital Admin portals.

## Features
- Patient registration with phone OTP verification (Twilio SMS in production; development OTP is printed in backend terminal).
- Patient login, profile, symptoms/consultation request and appointment history.
- Hospital directory with location/distance sorting when browser location and hospital coordinates are available; rating sorting.
- Doctor directory, specialities, weekly morning/afternoon/evening schedule and per-slot capacity.
- Appointment booking with atomic slot capacity checks, seat numbers and waitlisting.
- Emergency-priority handling: verified emergency requests can use the emergency-reserved seat. Emergency claims are not self-verified; hospital staff must verify them.
- Patient and doctor notifications.
- Doctor consultation notes and printable prescription.
- Hospital Admin portal to create/update hospital details, doctors and schedules.
- Role-based API authorization, password hashing, JWT, rate-limited OTP endpoints.

## Project layout
- `frontend/` — Vite + React
- `backend/` — Express + Mongoose API

## 1. MongoDB Atlas
Create a database named `careconnect`. Create a database user with a strong new password and allow your Render service to connect in Atlas Network Access.
Use the Atlas connection string in `backend/.env` locally and Render Environment Variables in production.

**Security:** A database password was exposed in the earlier chat. Rotate it in Atlas before deploying. Never commit `.env` or paste credentials into chat.

## 2. Backend local setup
```bash
cd backend
npm install
copy .env.example .env
```
Edit `.env`:
- `MONGODB_URI` — your new Atlas URI
- `JWT_SECRET` — long random secret (at least 32 characters)
- `CLIENT_URL` — `http://localhost:5173`
- `TWILIO_*` — optional for actual SMS OTP (required for SMS in production)

Start:
```bash
npm run dev
```
API health: `http://localhost:5000/api/health`

### OTP behavior
- In development, the generated OTP is logged in the backend terminal to make local testing possible.
- In production, configure Twilio Account SID, Auth Token, and a verified sender phone number. Without SMS provider credentials, OTP sending fails safely; it does not silently pretend that an SMS was sent.

## 3. Frontend local setup
```bash
cd frontend
npm install
copy .env.example .env
```
Set:
```env
VITE_API_URL=http://localhost:5000/api
```
Run:
```bash
npm run dev
```

## 4. Deploy to your existing Render service
Do not create a new service if you want to keep the existing URL.

Render service:
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

Set these Environment Variables in Render:
```env
NODE_ENV=production
MONGODB_URI=<NEW_ROTATED_ATLAS_URI>
JWT_SECRET=<LONG_RANDOM_SECRET>
JWT_EXPIRES_IN=7d
CLIENT_URL=https://careconnect-tawny-one.vercel.app
TWILIO_ACCOUNT_SID=<optional-but-required-for-production-SMS>
TWILIO_AUTH_TOKEN=<optional-but-required-for-production-SMS>
TWILIO_FROM_NUMBER=<your-Twilio-enabled-number>
```
Do not set `PORT`; Render supplies it automatically.
Deploy after saving variables.

## 5. Deploy to your existing Vercel project
Keep the existing Vercel project and domain:
`https://careconnect-tawny-one.vercel.app`

Vercel settings:
- Root Directory: `frontend`
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

Environment Variable:
```env
VITE_API_URL=https://careconnect-lp78.onrender.com/api
```
Redeploy after setting the variable.

The backend CORS allowlist includes the exact Vercel origin above and the `CLIENT_URL` environment variable. The frontend API helper removes trailing slashes to prevent `//hospitals` and related malformed paths.

## 6. GitHub: replace old repository contents
1. Extract this ZIP.
2. Open the extracted `CareConnect_Rebuilt` folder in VS Code.
3. In terminal, run:
```bash
git clone https://github.com/pd568138-design/CareConnect.git CareConnect-Git
```
4. Copy the contents of `CareConnect_Rebuilt` into `CareConnect-Git`, replacing old files. Do not copy `.env` files.
5. Open terminal inside `CareConnect-Git`:
```bash
git add -A
git commit -m "Rebuild CareConnect hospital management application"
git push origin main
```
If GitHub asks for authentication, sign in through VS Code/browser. Do not delete the repository itself; replacing tracked contents is safer and preserves the remote URL.
6. Wait for Render and Vercel auto-deployments. Confirm each deployment is successful.

## 7. First-time admin account
After backend is deployed, run locally with the production Atlas URI in backend `.env`:
```bash
cd backend
npm run create-admin
```
It creates an initial admin using `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PHONE`, and `ADMIN_PASSWORD` from `.env`. Use a unique strong password. Set these variables temporarily for the script, then remove `ADMIN_PASSWORD` from the environment after use. Do not expose admin credentials.

## Important operational notes
- Real SMS requires a configured Twilio account and sender number. This project does not include paid third-party credentials.
- Hospital distance requires browser location permission and coordinates entered for hospitals. Without them, results are sorted by rating.
- Hospital ratings are stored as admin-entered values in this version; they are not scraped from Google.
- The emergency priority workflow is a scheduling aid, not a medical triage system. Hospital staff must verify emergency status. Do not use this application to delay emergency medical care.
- Prescription templates are for clinician-entered records. A doctor must review and sign them; this is not a substitute for clinical judgment.
- For production healthcare use, obtain legal/security review, consent, audit logging, backups, encryption/key management, and applicable Indian data-protection/health regulations before storing real patient records.
