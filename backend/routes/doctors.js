import {Router} from "express";
import {Doctor} from "../models/index.js";
import {auth,allow} from "../middleware/auth.js";
const r=Router();
r.get("/",async(req,res)=>{try{res.json(await Doctor.find().sort({createdAt:-1}).lean());}catch{res.status(500).json({message:"Could not fetch doctors"});}});
r.post("/",auth,allow("admin"),async(req,res)=>{try{const {name,specialty}=req.body||{};if(!name||!specialty)return res.status(400).json({message:"Doctor name and specialty are required"});const d=await Doctor.create({...req.body,createdBy:req.user.id});res.status(201).json(d);}catch{res.status(500).json({message:"Could not create doctor"});}});
r.patch("/:id",auth,allow("admin"),async(req,res)=>{try{const d=await Doctor.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});if(!d)return res.status(404).json({message:"Doctor not found"});res.json(d);}catch{res.status(400).json({message:"Invalid doctor update"});}});
r.delete("/:id",auth,allow("admin"),async(req,res)=>{try{const d=await Doctor.findByIdAndDelete(req.params.id);if(!d)return res.status(404).json({message:"Doctor not found"});res.json({success:true});}catch{res.status(400).json({message:"Invalid doctor id"});}});
export default r;
