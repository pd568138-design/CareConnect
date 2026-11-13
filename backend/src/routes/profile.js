import { Router } from 'express';
import { User } from '../models.js';
import { auth, allow } from '../middleware/auth.js';
const router = Router();
router.patch('/me', auth, allow('patient'), async (req, res) => {
  const allowed = ['age','gender','address','name'];
  const update = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true }).select('-passwordHash');
  res.json(user);
});
export default router;
