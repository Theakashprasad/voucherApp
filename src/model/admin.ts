import mongoose, { Schema, Document, Model } from "mongoose";

// Define TypeScript interface
export interface IAdmin extends Document {
  username: string;
  password: string;
}

// Define schema
const AdminSchema = new Schema<IAdmin>(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { timestamps: true } // adds createdAt, updatedAt
);

// Create model safely (prevents overwrite in dev hot-reload)
const Admin: Model<IAdmin> =
  mongoose.models.Admin || mongoose.model<IAdmin>("Admin", AdminSchema);

export default Admin;
