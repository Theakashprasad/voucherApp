import mongoose, { Schema, Document } from "mongoose";
import { string } from "zod";

interface IVoucher {
  name: string;
  start: number;
  end: number;
  usedVouchers: string[];
}

export interface IBranch extends Document {
  branchName: string;
  username: string;
  password: string;
  vouchers: IVoucher[];
  Supplier: string[];
  createdAt: Date;
  updatedAt: Date;
}

const VoucherSchema = new Schema<IVoucher>({
  name: { type: String, required: true, trim: true },
  start: { type: Number, required: true, min: 1 },
  end: { type: Number, required: true, min: 1 },
  usedVouchers: {
    type: [String],
    default: () => [],
    required: true,
  },
});

const BranchSchema = new Schema<IBranch>(
  {
    branchName: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true }, // hash before saving
    vouchers: { type: [VoucherSchema], default: [] },
    Supplier: { type: [String], default: () => [] },
  },
  { timestamps: true }
);

const Branch =
  mongoose.models.Branch || mongoose.model<IBranch>("Branch", BranchSchema);

export default Branch;
