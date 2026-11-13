import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
  phoneVerified: { type: Boolean, default: false },
  age: { type: Number, min: 0, max: 120 },
  gender: String,
  address: String,
  active: { type: Boolean, default: true }
}, { timestamps: true });

const otpSchema = new Schema({
  phone: { type: String, required: true, index: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  attempts: { type: Number, default: 0 }
}, { timestamps: true });

const hospitalSchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: String,
  address: { type: String, required: true },
  city: { type: String, required: true },
  latitude: Number,
  longitude: Number,
  rating: { type: Number, min: 0, max: 5, default: 0 },
  facilities: [String],
  phone: String,
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const scheduleSchema = new Schema({
  day: { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], required: true },
  period: { type: String, enum: ['Morning','Afternoon','Evening'], required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  capacity: { type: Number, min: 1, max: 100, required: true },
  emergencyReserve: { type: Number, min: 0, default: 1 }
}, { _id: true });

const doctorSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true },
  name: { type: String, required: true },
  speciality: { type: String, required: true },
  qualification: String,
  experienceYears: { type: Number, default: 0 },
  description: String,
  consultationFee: { type: Number, default: 0 },
  schedule: [scheduleSchema],
  active: { type: Boolean, default: true }
}, { timestamps: true });

const slotSchema = new Schema({
  _id: String,
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true },
  date: { type: String, required: true },
  period: { type: String, required: true },
  capacity: { type: Number, required: true },
  emergencyReserve: { type: Number, default: 1 },
  bookings: [{ appointmentId: Schema.Types.ObjectId, patientId: Schema.Types.ObjectId, priority: Number, seatNumber: Number }]
}, { timestamps: true });

const appointmentSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true },
  date: { type: String, required: true },
  period: { type: String, required: true },
  startTime: String,
  endTime: String,
  seatNumber: Number,
  status: { type: String, enum: ['CONFIRMED','WAITLISTED','CANCELLED','COMPLETED'], default: 'CONFIRMED' },
  priority: { type: Number, default: 0 },
  emergencyRequested: { type: Boolean, default: false },
  emergencyVerified: { type: Boolean, default: false },
  symptoms: String,
  diagnosis: String,
  consultationNotes: String,
  prescription: [{ medicine: String, dosage: String, timing: String, duration: String, instructions: String }],
  doctorReviewedAt: Date
}, { timestamps: true });

export const User = model('User', userSchema);
export const OTP = model('OTP', otpSchema);
export const Hospital = model('Hospital', hospitalSchema);
export const Doctor = model('Doctor', doctorSchema);
export const Slot = model('Slot', slotSchema);
export const Appointment = model('Appointment', appointmentSchema);
