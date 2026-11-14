import {Router} from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import {User} from "../models/index.js";
const router=Router(), pending=new Map();
const otpLimit=rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:true,legacyHeaders:false});
const norm=e=>String(e||"").trim().toLowerCase();
router.post("/request-otp",otpLimit,async(req,res)=>{
 try{
  const {name,email,phone,role="patient"}=req.body||{};
  if(!name||!email||!phone)return res.status(400).json({message:"Name, email and phone are required"});
  if(!["patient","doctor","admin"].includes(role))return res.status(400).json({message:"Invalid role"});
  const key=norm(email),existing=await User.findOne({email:key});
  if(existing)return res.status(409).json({message:"This email is already registered. Please login."});
  const otp=String(crypto.randomInt(100000,1000000));
  pending.set(key,{otp,profile:{name:String(name).trim(),email:key,phone:String(phone).trim(),role},expires:Date.now()+5*60*1000});
  return res.json({success:true,message:"Demo OTP generated",demoOtp:otp,expiresIn:300});
 }catch(e){return res.status(500).json({message:"Unable to generate OTP",detail:process.env.NODE_ENV==="development"?e.message:undefined});}
});
router.post("/verify-otp",async(req,res)=>{
 try{
  const {email,otp}=req.body||{},key=norm(email),entry=pending.get(key);
  if(!entry||entry.expires<Date.now())return res.status(400).json({message:"OTP expired. Generate a new OTP."});
  if(String(otp)!==entry.otp)return res.status(400).json({message:"Incorrect OTP"});
  const user=await User.create({...entry.profile,verified:true});pending.delete(key);
  const token=jwt.sign({id:user._id,email:user.email,role:user.role,name:user.name},process.env.JWT_SECRET,{expiresIn:"7d"});
  return res.status(201).json({token,user:{id:user._id,name:user.name,email:user.email,role:user.role}});
 }catch(e){return res.status(500).json({message:e.code===11000?"Email already registered":"OTP verification failed"});}
});
router.post("/login",async(req,res)=>{
 try{
  const email=norm(req.body?.email),{password}=req.body||{};
  if(!email||!password)return res.status(400).json({message:"Email and password are required"});
  const user=await User.findOne({email});
  if(!user||!user.passwordHash||!(await bcrypt.compare(password,user.passwordHash)))return res.status(401).json({message:"Invalid credentials. If this is your first visit, register with OTP."});
  const token=jwt.sign({id:user._id,email:user.email,role:user.role,name:user.name},process.env.JWT_SECRET,{expiresIn:"7d"});
  res.json({token,user:{id:user._id,name:user.name,email:user.email,role:user.role}});
 }catch{return res.status(500).json({message:"Login failed"});}
});
export default router;
