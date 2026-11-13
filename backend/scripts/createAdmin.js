import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models.js';

await connectDB();
const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD } = process.env;
if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PHONE || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
  console.error('Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE and ADMIN_PASSWORD (minimum 12 characters) in backend/.env first.');
  process.exit(1);
}
const existing = await User.findOne({ $or: [{ email: ADMIN_EMAIL.toLowerCase() }, { phone: ADMIN_PHONE }] });
if (existing) {
  console.log('An account already exists with this email or phone. No changes made.');
} else {
  await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL.toLowerCase(), phone: ADMIN_PHONE, passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12), role: 'admin', phoneVerified: true });
  console.log('Initial admin account created. Remove ADMIN_PASSWORD from environment after use.');
}
process.exit(0);
