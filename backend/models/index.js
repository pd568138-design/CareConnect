import mongoose from "mongoose";
const userSchema = new mongoose.Schema({name:{type:String,required:true,trim:true},email:{type:String,required:true,unique:true,lowercase:true,trim:true},phone:{type:String,required:true},role:{type:String,enum:["patient","doctor","admin"],default:"patient"},passwordHash:String,verified:{type:Boolean,default:false}}, {timestamps:true});
export const User = mongoose.model("User", userSchema);
const doctorSchema = new mongoose.Schema({name:{type:String,required:true},specialty:{type:String,required:true},qualification:String,experience:Number,hospital:String,location:String,slots:String,createdBy:String},{timestamps:true});
export const Doctor = mongoose.model("Doctor",doctorSchema);
const appointmentSchema = new mongoose.Schema({patient:{type:mongoose.Schema.Types.ObjectId,ref:"User"},patientName:String,patientEmail:String,age:Number,bloodGroup:String,symptoms:String,specialty:String,priority:{type:String,enum:["routine","soon","urgent"],default:"routine"},status:{type:String,enum:["pending","accepted","rejected","completed"],default:"pending"},assignedDoctor:String,appointmentDate:Date,slot:String},{timestamps:true});
export const Appointment = mongoose.model("Appointment",appointmentSchema);
const prescriptionSchema = new mongoose.Schema({appointmentId:String,patientId:String,diagnosis:String,medicines:[{name:String,dosage:String,schedule:[String]}]},{timestamps:true});
export const Prescription = mongoose.model("Prescription",prescriptionSchema);
