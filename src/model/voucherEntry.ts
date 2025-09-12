import mongoose, { Schema, Document } from "mongoose";

export interface IVoucherEntry extends Document {
  branchId: string;
  voucherNo: string;
  invoiceNo?: string;
  voucherGivenDate: Date;
  supplier: string;
  amount: number;
  dues: number;
  return: number;
  discountAdvance: number;
  netBalance: number;
  modeOfPayment: string;
  chqCashIssuedDate?: Date;
  amountPaid: number;
  voucherClearedDate?: Date;
  remarks?: string;
  status: "pending" | "active";
  voucherBook: string;
}

const VoucherEntrySchema = new Schema<IVoucherEntry>(
  {
    branchId: { type: String, required: true, trim: true },
    voucherNo: { type: String, required: true, trim: true },
    invoiceNo: { type: String, trim: true },
    voucherGivenDate: { type: Date, required: true },
    supplier: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    dues: { type: Number, required: true, min: 0 },
    return: { type: Number, required: true, min: 0 },
    discountAdvance: { type: Number, required: true, min: 0 },
    netBalance: { type: Number, required: true, min: 0 },
    modeOfPayment: {
      type: String,
      required: true,
    },
    chqCashIssuedDate: { type: Date },
    amountPaid: { type: Number, required: true, min: 0 },
    voucherClearedDate: { type: Date },
    remarks: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "active"],
      default: "pending",
    },
    voucherBook: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// In dev with hot reload, ensure the model picks up schema changes
if (mongoose.models.VoucherEntry) {
  delete mongoose.models.VoucherEntry;
}
const VoucherEntry = mongoose.model<IVoucherEntry>(
  "VoucherEntry",
  VoucherEntrySchema
);

export default VoucherEntry;
