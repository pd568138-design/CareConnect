import mongoose from "mongoose";
export async function connectDB() {
  if (!process.env.MONGODB_URI) { console.warn("MONGODB_URI is missing. Server will run without database persistence."); return false; }
  try { await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 }); console.log("MongoDB connected"); return true; }
  catch (error) { console.error("MongoDB connection failed:", error.message); return false; }
}
