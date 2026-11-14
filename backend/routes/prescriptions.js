import {Router} from "express";
import {Prescription,Appointment} from "../models/index.js";
import {auth,allow} from "../middleware/auth.js";
import {notifyUser} from "../utils/notify.js";
const r=Router();r.use(auth);
r.get("/",async(req,res)=>{try{const q=req.user.role==="patient"?{patientId:req.user.id}:{};res.json(await Prescription.find(q).sort({createdAt:-1}).lean());}catch{res.status(500).json({message:"Could not fetch prescriptions"});}});
r.post("/",allow("doctor","admin"),async(req,res)=>{try{const {appointmentId,diagnosis,medicines}=req.body||{};if(!appointmentId||!diagnosis||!Array.isArray(medicines)||!medicines.length)return res.status(400).json({message:"Appointment, diagnosis and medicine are required"});const a=await Appointment.findById(appointmentId);if(!a)return res.status(404).json({message:"Appointment not found"});const p=await Prescription.create({appointmentId,patientId:String(a.patient),diagnosis,medicines});notifyUser(a.patient,"A new prescription is available.","prescription");res.status(201).json(p);}catch{res.status(500).json({message:"Could not save prescription"});}});
export default r;
