
import "dotenv/config";
import express from "express";
import http from "node:http";
import cors from "cors";
import helmet from "helmet";
import { Server } from "socket.io";

import { connectDB } from "./config/db.js";
import { setIO } from "./utils/notify.js";

import authRoutes from "./routes/auth.js";
import doctorRoutes from "./routes/doctors.js";
import appointmentRoutes from "./routes/appointments.js";
import prescriptionRoutes from "./routes/prescriptions.js";

const required = ["JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`${key} is required`);
    process.exit(1);
  }
}

await connectDB();

const app = express();
const server = http.createServer(app);

const allowedOrigins = (
  process.env.CLIENT_URL || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""));

// Allow configured origins and this project's Vercel preview deployments.
const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  const normalized = origin.replace(/\/$/, "");

  if (allowedOrigins.includes(normalized)) {
    return true;
  }

  return /^https:\/\/careconnect-[a-z0-9-]+-pd568138-designs-projects\.vercel\.app$/i.test(normalized);
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS origin not allowed"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204
};

app.use(helmet({
  crossOriginResourcePolicy: {
    policy: "cross-origin"
  }
}));

// CORS must run before API routes.
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "1mb" }));

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Socket CORS origin not allowed"));
      }
    },
    methods: ["GET", "POST", "PATCH", "DELETE"]
  }
});

setIO(io);

io.on("connection", (socket) => {
  socket.on("join", ({ userId, role } = {}) => {
    if (userId) socket.join(String(userId));
    if (role) socket.join(`role:${role}`);
  });
});

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Healthcare Intelligence API"
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    database: process.env.MONGODB_URI
      ? "configured"
      : "not-configured"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/prescriptions", prescriptionRoutes);

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err.message);

  if (err.message === "CORS origin not allowed") {
    return res.status(403).json({
      success: false,
      message: "Origin not allowed"
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

const port = Number(process.env.PORT) || 5000;

server.listen(port, "0.0.0.0", () => {
  console.log(`Healthcare API listening on ${port}`);
});
