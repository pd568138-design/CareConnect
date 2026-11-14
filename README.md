# CareLoom — Healthcare Intelligence

A demo-ready healthcare appointment coordination starter with Patient, Doctor and Hospital Admin roles, demo OTP, doctor directory, appointment requests, prescriptions, Socket.IO notifications and a separate Python AI helper.

## Important safety and scope
- This is a software prototype, not a production clinical system.
- Do not enter real patient information. Use synthetic/demo data only.
- The priority algorithm is an administrative routing aid, not medical diagnosis or emergency triage. Emergency symptoms require immediate local emergency care.
- Demo OTP is displayed in the browser response and is not secure enough for production.
- The current login route is a placeholder: OTP registration creates a verified account, but password login requires a password hash and password setup flow which must be added before production. For this starter, use registration and keep the session active.
- Do not deploy with demo OTP enabled for real users. Add audited access control, consent, encryption, backups, retention policies and security testing before handling health data.

## Requirements
- Node.js 20 or later
- Python 3.10 or later
- MongoDB Atlas database (or local MongoDB)

## 1. Backend
```bash
cd backend
npm install
```
Copy `.env.example` to `.env`. Set `MONGODB_URI` and a long random `JWT_SECRET`. For local development:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
JWT_SECRET=replace_with_a_long_random_secret_at_least_32_characters
CLIENT_URL=http://localhost:5173
```
Start:
```bash
npm run dev
```
Test `http://localhost:5000/health`.

If you do not set `MONGODB_URI`, the API starts but database-backed routes will not work. Configure Atlas before using the app.

## 2. Frontend
Open a second terminal:
```bash
cd frontend
npm install
```
Copy `.env.example` to `.env` (default local URLs are already set), then:
```bash
npm run dev
```
Open `http://localhost:5173`.

Register with a demo email and phone. The OTP is shown on screen. Select the correct role:
- Patient: create appointment requests and view records.
- Hospital admin: add doctors and accept/reject requests.
- Doctor: view requests and create prescriptions.

For the prototype, create one admin account and one patient account using different email addresses. A role is selected during demo registration; do not expose self-selected roles in a real deployment. Production must use administrator-provisioned accounts and a proper password/MFA flow.

## 3. AI engine (optional)
```bash
cd ai-engine
python -m venv .venv
```
Windows PowerShell:
```powershell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API docs: `http://127.0.0.1:8000/docs`.

## Deployment
### Render backend
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment variables: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` (your Vercel domain), `NODE_ENV=production`
- Render service URL is your API host.

### Vercel frontend
- Root Directory: `frontend`
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment variable: `VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`
- Environment variable: `VITE_SOCKET_URL=https://YOUR-RENDER-SERVICE.onrender.com`

After changing Vercel environment variables, redeploy. Ensure Render `CLIENT_URL` exactly matches the Vercel deployment origin.

### MongoDB Atlas
Create a database named `healthcare_intelligence`, create a database user, allow the Render outbound network according to your security policy, and place the connection string only in Render environment variables. Never commit `.env`.

## API overview
- `POST /api/auth/request-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/login` (requires password setup extension)
- `GET/POST /api/doctors`
- `PATCH/DELETE /api/doctors/:id`
- `GET/POST /api/appointments`
- `PATCH /api/appointments/:id/status`
- `GET/POST /api/prescriptions`

## Current prototype limitations
- Appointment requests are not yet assigned automatically to a doctor; admin/doctor handles the request.
- The AI engine runs as a separate service and is not yet called by the Node API.
- Prescription reminder scheduling, email/SMS, doctor calendar slots, appointment update/delete UI and production-grade login/password setup are not included in this first working baseline.
- Socket.IO notifications are real-time while the browser session is connected; persistent notification history and background push notifications require additional services.
