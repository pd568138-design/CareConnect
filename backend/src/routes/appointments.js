import { Router } from 'express';
import mongoose from 'mongoose';
import { Appointment, Doctor, Hospital, Slot } from '../models.js';
import { auth, allow } from '../middleware/auth.js';
const router = Router();

const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const makeSlotId = (doctorId, date, period) => `${doctorId}_${date}_${period}`.replace(/[^a-zA-Z0-9_-]/g, '');

router.post('/book', auth, allow('patient'), async (req, res) => {
  try {
    const { doctorId, date, period, symptoms, emergencyRequested = false } = req.body;
    if (!doctorId || !date || !period || !symptoms) return res.status(400).json({ message: 'Select a doctor, date, time and describe your concern.' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < new Date().toISOString().slice(0,10)) return res.status(400).json({ message: 'Choose a valid future date.' });
    const doctor = await Doctor.findOne({ _id: doctorId, active: true }).populate('hospitalId');
    if (!doctor) return res.status(404).json({ message: 'Doctor is not available.' });
    const day = dayNames[new Date(`${date}T12:00:00`).getDay()];
    const schedule = doctor.schedule.find(s => s.day === day && s.period === period);
    if (!schedule) return res.status(400).json({ message: 'This doctor has no published session for the selected day and period.' });

    const slotId = makeSlotId(doctor._id, date, period);
    await Slot.updateOne({ _id: slotId }, { $setOnInsert: { doctorId: doctor._id, hospitalId: doctor.hospitalId._id, date, period, capacity: schedule.capacity, emergencyReserve: Math.min(schedule.emergencyReserve || 0, schedule.capacity) } }, { upsert: true });

    const appointmentId = new mongoose.Types.ObjectId();
    const slot = await Slot.findById(slotId);
    const verifiedEmergency = false; // Only hospital staff can verify an emergency.
    const isEmergency = Boolean(emergencyRequested && verifiedEmergency);
    const normalCount = slot.bookings.filter(b => b.priority === 0).length;
    const canUseSeat = slot.bookings.length < slot.capacity && (isEmergency || normalCount < Math.max(0, slot.capacity - slot.emergencyReserve));
    if (!canUseSeat) {
      const waitlisted = await Appointment.create({ _id: appointmentId, patientId: req.user._id, doctorId: doctor._id, hospitalId: doctor.hospitalId._id, date, period, startTime: schedule.startTime, endTime: schedule.endTime, status: 'WAITLISTED', priority: isEmergency ? 100 : 0, emergencyRequested: Boolean(emergencyRequested), symptoms });
      return res.status(201).json({ appointment: waitlisted, message: 'No standard seat is available. You are on the waitlist; the hospital must review emergency requests.' });
    }
    const updated = await Slot.findOneAndUpdate(
      { _id: slotId, $expr: { $and: [{ $lt: [{ $size: '$bookings' }, '$capacity'] }, { $or: [ { $eq: [isEmergency, true] }, { $lt: [{ $size: { $filter: { input: '$bookings', as: 'b', cond: { $eq: ['$$b.priority', 0] } } } }, { $subtract: ['$capacity', '$emergencyReserve'] }] } ] }] } },
      [{ $set: { bookings: { $concatArrays: ['$bookings', [{ appointmentId, patientId: req.user._id, priority: isEmergency ? 100 : 0, seatNumber: { $add: [{ $size: '$bookings' }, 1] } }]] } } }],
      { new: true }
    );
    if (!updated) {
      const waitlisted = await Appointment.create({ _id: appointmentId, patientId: req.user._id, doctorId: doctor._id, hospitalId: doctor.hospitalId._id, date, period, startTime: schedule.startTime, endTime: schedule.endTime, status: 'WAITLISTED', priority: 0, emergencyRequested: Boolean(emergencyRequested), symptoms });
      return res.status(201).json({ appointment: waitlisted, message: 'The slot filled while you were booking. You have been waitlisted.' });
    }
    const booking = updated.bookings.find(b => String(b.appointmentId) === String(appointmentId));
    const appointment = await Appointment.create({ _id: appointmentId, patientId: req.user._id, doctorId: doctor._id, hospitalId: doctor.hospitalId._id, date, period, startTime: schedule.startTime, endTime: schedule.endTime, seatNumber: booking.seatNumber, status: 'CONFIRMED', priority: isEmergency ? 100 : 0, emergencyRequested: Boolean(emergencyRequested), symptoms });
    res.status(201).json({ appointment, message: `Appointment confirmed. Your seat number is ${booking.seatNumber}.` });
  } catch (e) { res.status(400).json({ message: e.message || 'Could not book this appointment.' }); }
});

router.get('/mine', auth, allow('patient'), async (req, res) => {
  const items = await Appointment.find({ patientId: req.user._id }).populate('doctorId', 'name speciality').populate('hospitalId', 'name address city').sort({ createdAt: -1 });
  res.json(items);
});

router.get('/doctor', auth, allow('doctor'), async (req, res) => {
  const doctor = await Doctor.findOne({ userId: req.user._id });
  const items = await Appointment.find({ doctorId: doctor._id }).populate('patientId', 'name phone age gender').populate('hospitalId', 'name address').sort({ date: 1, createdAt: 1 });
  res.json(items);
});

router.get('/admin', auth, allow('admin'), async (req, res) => {
  const hospitals = await Hospital.find({ adminId: req.user._id }).select('_id');
  const hospitalIds = hospitals.map(h => h._id);
  const items = await Appointment.find({ hospitalId: { $in: hospitalIds } })
    .populate('patientId', 'name phone age gender')
    .populate('doctorId', 'name speciality')
    .populate('hospitalId', 'name address')
    .sort({ date: 1, createdAt: 1 });
  res.json(items);
});

router.patch('/:id/emergency-review', auth, allow('admin','doctor'), async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment || !appointment.emergencyRequested) return res.status(404).json({ message: 'Emergency request not found.' });
  if (req.body.verified !== true) return res.status(400).json({ message: 'Set verified=true to approve the emergency request.' });
  if (req.user.role === 'admin') {
    const hospital = await Hospital.findOne({ _id: appointment.hospitalId, adminId: req.user._id });
    if (!hospital) return res.status(403).json({ message: 'This appointment does not belong to your hospital.' });
  } else {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor || String(doctor._id) !== String(appointment.doctorId)) return res.status(403).json({ message: 'This appointment is not assigned to you.' });
  }
  appointment.emergencyVerified = true;
  appointment.priority = 100;
  if (appointment.status === 'WAITLISTED') {
    const slotId = makeSlotId(appointment.doctorId, appointment.date, appointment.period);
    const slot = await Slot.findOneAndUpdate(
      { _id: slotId, $expr: { $lt: [{ $size: '$bookings' }, '$capacity'] } },
      [{ $set: { bookings: { $concatArrays: ['$bookings', [{ appointmentId: appointment._id, patientId: appointment.patientId, priority: 100, seatNumber: { $add: [{ $size: '$bookings' }, 1] } }]] } } }],
      { new: true }
    );
    if (slot) {
      const booking = slot.bookings.find(b => String(b.appointmentId) === String(appointment._id));
      appointment.seatNumber = booking.seatNumber;
      appointment.status = 'CONFIRMED';
    }
  }
  await appointment.save();
  res.json({ appointment, message: appointment.status === 'CONFIRMED' ? 'Emergency priority verified and seat allocated.' : 'Emergency priority verified. No seat is free yet; request remains waitlisted.' });
});

router.patch('/:id/consultation', auth, allow('doctor'), async (req, res) => {
  const doctor = await Doctor.findOne({ userId: req.user._id });
  const appointment = await Appointment.findOne({ _id: req.params.id, doctorId: doctor._id });
  if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });
  appointment.diagnosis = req.body.diagnosis || '';
  appointment.consultationNotes = req.body.consultationNotes || '';
  appointment.prescription = Array.isArray(req.body.prescription) ? req.body.prescription : [];
  appointment.doctorReviewedAt = new Date();
  appointment.status = 'COMPLETED';
  await appointment.save();
  res.json({ appointment, message: 'Consultation and prescription saved.' });
});

router.get('/:id', auth, async (req, res) => {
  const filter = req.user.role === 'patient' ? { patientId: req.user._id } : {};
  const appointment = await Appointment.findOne({ _id: req.params.id, ...filter }).populate('patientId', 'name age phone').populate('doctorId', 'name speciality').populate('hospitalId', 'name address city');
  if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });
  res.json(appointment);
});
export default router;
