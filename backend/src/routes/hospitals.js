import { Router } from 'express';
import { Hospital, Doctor } from '../models.js';
import { auth, allow } from '../middleware/auth.js';
const router = Router();

router.get('/', async (req, res) => {
  const hospitals = await Hospital.find({ active: true }).sort({ rating: -1 }).lean();
  res.json(hospitals);
});

router.post('/', auth, allow('admin'), async (req, res) => {
  const { name, address, city } = req.body;
  if (!name || !address || !city) return res.status(400).json({ message: 'Hospital name, address and city are required.' });
  const hospital = await Hospital.create({ ...req.body, adminId: req.user._id });
  res.status(201).json(hospital);
});

router.patch('/:id', auth, allow('admin'), async (req, res) => {
  const hospital = await Hospital.findOneAndUpdate({ _id: req.params.id, adminId: req.user._id }, req.body, { new: true, runValidators: true });
  if (!hospital) return res.status(404).json({ message: 'Hospital not found.' });
  res.json(hospital);
});

router.get('/:id/doctors', async (req, res) => {
  const doctors = await Doctor.find({ hospitalId: req.params.id, active: true }).populate('hospitalId', 'name address city rating').lean();
  res.json(doctors);
});
export default router;
