import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Doctor, User, Hospital, Appointment } from '../models.js';
import { auth, allow } from '../middleware/auth.js';
const router = Router();

router.get('/', async (req, res) => {
  const filter = { active: true };
  if (req.query.hospitalId) filter.hospitalId = req.query.hospitalId;
  if (req.query.speciality) filter.speciality = new RegExp(String(req.query.speciality), 'i');
  const doctors = await Doctor.find(filter).populate('hospitalId', 'name address city rating').lean();
  res.json(doctors);
});

router.post('/', auth, allow('admin'), async (req, res) => {
  const { name, email, phone, password, hospitalId, speciality } = req.body;
  if (!name || !email || !phone || !password || !hospitalId || !speciality) return res.status(400).json({ message: 'Complete all required doctor details.' });
  const hospital = await Hospital.findOne({ _id: hospitalId, adminId: req.user._id });
  if (!hospital) return res.status(403).json({ message: 'You can add doctors only to your hospital.' });
  const user = await User.create({ name, email, phone, passwordHash: await bcrypt.hash(password, 12), role: 'doctor', phoneVerified: true });
  const doctor = await Doctor.create({ ...req.body, userId: user._id, hospitalId });
  res.status(201).json(doctor);
});

router.get('/:id/availability', async (req, res) => {
  const { date, period } = req.query;
  if (!date || !period) return res.status(400).json({ message: 'Date and period are required.' });
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found.' });
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const day = dayNames[new Date(`${date}T12:00:00`).getDay()];
  const session = doctor.schedule.find(s => s.day === day && s.period === period);
  if (!session) return res.json({ available: false, capacity: 0, booked: 0, remaining: 0, message: 'No published session for this day.' });
  const slotId = `${doctor._id}_${date}_${period}`.replace(/[^a-zA-Z0-9_-]/g, '');
  const { Slot } = await import('../models.js');
  const slot = await Slot.findById(slotId).lean();
  const booked = slot?.bookings?.length || 0;
  res.json({ available: booked < session.capacity, capacity: session.capacity, booked, remaining: Math.max(0, session.capacity - booked), emergencyReserve: session.emergencyReserve || 0, startTime: session.startTime, endTime: session.endTime });
});

router.get('/me', auth, allow('doctor'), async (req, res) => {
  const doctor = await Doctor.findOne({ userId: req.user._id }).populate('hospitalId');
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found.' });
  res.json(doctor);
});

router.patch('/me/schedule', auth, allow('doctor'), async (req, res) => {
  const doctor = await Doctor.findOneAndUpdate({ userId: req.user._id }, { schedule: req.body.schedule }, { new: true, runValidators: true });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found.' });
  res.json(doctor);
});

router.get('/me/appointments', auth, allow('doctor'), async (req, res) => {
  const doctor = await Doctor.findOne({ userId: req.user._id });
  const appointments = await Appointment.find({ doctorId: doctor._id }).populate('patientId', 'name phone age gender').populate('hospitalId', 'name address').sort({ date: 1, createdAt: 1 });
  res.json(appointments);
});
export default router;
