
import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { User } from "../models/index.js";

const router = Router();
const pending = new Map();

const otpLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many OTP requests. Try again later." }
});

const verifyLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many verification attempts. Try again later." }
});

const norm = (value) => String(value || "").trim().toLowerCase();

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing in environment variables");
  }

  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

// REGISTER: REQUEST OTP
router.post("/request-otp", otpLimit, async (req, res) => {
  try {
    const { name, email, phone, role = "patient" } = req.body || {};

    const cleanName = String(name || "").trim();
    const cleanEmail = norm(email);
    const cleanPhone = String(phone || "").trim();
    const cleanRole = norm(role);

    if (!cleanName || !cleanEmail || !cleanPhone) {
      return res.status(400).json({
        success: false,
        message: "Name, email and phone are required."
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address."
      });
    }

    if (!["patient", "doctor", "admin"].includes(cleanRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account role."
      });
    }

    if (cleanName.length > 100 || cleanPhone.length > 20) {
      return res.status(400).json({
        success: false,
        message: "Name or phone number is too long."
      });
    }

    const existing = await User.findOne({ email: cleanEmail });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered. Please login."
      });
    }

    const otp = String(crypto.randomInt(100000, 1000000));

    pending.set(cleanEmail, {
      otp,
      attempts: 0,
      profile: {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: cleanRole
      },
      expires: Date.now() + 5 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      message: "Demo OTP generated successfully.",
      demoOtp: otp,
      expiresIn: 300
    });

  } catch (error) {
    console.error("REQUEST OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate OTP."
    });
  }
});

// REGISTER: VERIFY OTP
router.post("/verify-otp", verifyLimit, async (req, res) => {
  try {
    const email = norm(req.body?.email);
    const otp = String(req.body?.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required."
      });
    }

    const entry = pending.get(email);

    if (!entry || entry.expires < Date.now()) {
      pending.delete(email);

      return res.status(400).json({
        success: false,
        message: "OTP expired. Generate a new OTP."
      });
    }

    if (entry.attempts >= 5) {
      pending.delete(email);

      return res.status(429).json({
        success: false,
        message: "Too many incorrect OTP attempts. Generate a new OTP."
      });
    }

    if (!/^\d{6}$/.test(otp) || otp !== entry.otp) {
      entry.attempts += 1;

      return res.status(400).json({
        success: false,
        message: "Incorrect OTP."
      });
    }

    const existing = await User.findOne({ email });

    if (existing) {
      pending.delete(email);

      return res.status(409).json({
        success: false,
        message: "Email already registered. Please login."
      });
    }

    const user = await User.create({
      ...entry.profile,
      verified: true
    });

    pending.delete(email);

    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      token,
      user: publicUser(user)
    });

  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already registered."
      });
    }

    return res.status(500).json({
      success: false,
      message: "OTP verification failed."
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const email = norm(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const user = await User.findOne({ email });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials. This account does not have a password set."
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Incorrect email or password."
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: publicUser(user)
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed."
    });
  }
});

export default router;
