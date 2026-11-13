import { Router } from 'express';
import { Appointment, Doctor } from '../models.js';
import { auth } from '../middleware/auth.js';
const router = Router();
router.get('/', auth, async (req, res) => {
  let filter = {};
  if (req.user.role === 'patient') filter.patientId = req.user._id;
  else if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    filter.doctorId = doctor?._id;
  }
  const items = await Appointment.find(filter).populate('patientId', 'name').populate('doctorId', 'name speciality').populate('hospitalId', 'name').sort({ updatedAt: -1 }).limit(40);
  res.json(items.map(a => ({
    id: a._id, title: a.status === 'CONFIRMED' ? 'Appointment confirmed' : a.status === 'WAITLISTED' ? 'Appointment waitlisted' : a.status === 'COMPLETED' ? 'Consultation completed' : 'Appointment update',
    message: `${a.patientId?.name || 'Patient'} · ${a.doctorId?.name || 'Doctor'} · ${a.hospitalId?.name || 'Hospital'} · ${a.date} ${a.period}`,
    status: a.status, createdAt: a.updatedAt
  })));
});
export default router;
