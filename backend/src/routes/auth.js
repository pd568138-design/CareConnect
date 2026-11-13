
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { User, OTP } from '../models.js';
import { hashOTP } from '../utils/otp.js';
import { auth } from '../middleware/auth.js';

const router = Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false
});

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {};

    if (!name || !email || !phone || !password || String(password).length < 8) {
      return res.status(400).json({
        message: 'Enter all details. Password must contain at least 8 characters.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = String(phone).replace(/[^\d+]/g, '');

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { phone: normalizedPhone }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'Account already exists with this email or phone.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Generate automatic 6-digit demo OTP
    const code = crypto.randomInt(100000, 1000000).toString();

    req.app.locals.pendingRegistrations ??= new Map();

    req.app.locals.pendingRegistrations.set(normalizedPhone, {
      name: String(name).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      expires: Date.now() + 5 * 60 * 1000
    });

    await OTP.deleteMany({ phone: normalizedPhone });

    await OTP.create({
      phone: normalizedPhone,
      codeHash: hashOTP(code),
      attempts: 0,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    console.log('CARECONNECT DEMO OTP:', code);

    return res.status(201).json({
      success: true,
      message: 'Demo OTP generated successfully.',
      verificationPending: true,
      phone: normalizedPhone,
      demoOTP: code
    });

  } catch (error) {
    console.error('REGISTER ERROR:', error);

    return res.status(500).json({
      message: 'Registration failed. Please try again.'
    });
  }
});

// VERIFY OTP
router.post('/verify-otp', otpLimiter, async (req, res) => {
  try {
    const phone = String(req.body.phone || '').replace(/[^\d+]/g, '');
    const code = String(req.body.code || '').trim();

    if (!phone || !/^\d{6}$/.test(code)) {
      return res.status(400).json({
        message: 'Enter a valid 6-digit OTP.'
      });
    }

    const otp = await OTP.findOne({ phone });
    const pending = req.app.locals.pendingRegistrations?.get(phone);

    if (!otp || !pending ||
        pending.expires < Date.now() ||
        otp.expiresAt < new Date()) {
      return res.status(400).json({
        message: 'OTP expired. Please register again.'
      });
    }

    if (Number(otp.attempts || 0) >= 5) {
      return res.status(429).json({
        message: 'Too many incorrect attempts. Register again.'
      });
    }

    if (otp.codeHash !== hashOTP(code)) {
      otp.attempts = Number(otp.attempts || 0) + 1;
      await otp.save();

      return res.status(400).json({
        message: 'Incorrect OTP.'
      });
    }

    const user = await User.create({
      name: pending.name,
      email: pending.email,
      phone: pending.phone,
      passwordHash: pending.passwordHash,
      role: 'patient',
      phoneVerified: true
    });

    await OTP.deleteMany({ phone });

    req.app.locals.pendingRegistrations.delete(phone);

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      message: 'Account verified successfully.'
    });

  } catch (error) {
    console.error('OTP VERIFICATION ERROR:', error);

    return res.status(error.code === 11000 ? 409 : 500).json({
      message: error.code === 11000
        ? 'Email or phone already registered.'
        : 'OTP verification failed.'
    });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};

    if (!identifier || !password) {
      return res.status(400).json({
        message: 'Enter email/phone and password.'
      });
    }

    const value = String(identifier).trim();

    const user = await User.findOne({
      $or: [
        { email: value.toLowerCase() },
        { phone: value.replace(/[^\d+]/g, '') }
      ]
    });

    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      return res.status(401).json({
        message: 'Invalid login details.'
      });
    }

    if (!user.phoneVerified) {
      return res.status(403).json({
        message: 'Verify your phone number before login.'
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    console.error('LOGIN ERROR:', error);

    return res.status(500).json({
      message: 'Login failed.'
    });
  }
});

// GET CURRENT USER
router.get('/me', auth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
