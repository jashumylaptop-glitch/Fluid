import mongoose from "mongoose";
import { nanoid } from "nanoid";

const AdminSchema = new mongoose.Schema({
  adminId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  permissions: [String],
  createdAt: { type: Date, default: () => new Date() }
});

AdminSchema.statics.generateAdminId = function () {
  const year = new Date().getFullYear().toString().slice(-2);
  const unique = nanoid(6).toUpperCase();
  return `ADM-${year}-${unique}`;
};

export default mongoose.model("Admin", AdminSchema);
