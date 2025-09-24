import mongoose, { Schema, Document } from "mongoose";

export interface IVoucherEntry extends Document {
  branchId?: string;
  voucherNo?: string;
  invoiceNo?: string;
  voucherGivenDate?: Date;
  supplier?: string;
  amount?: number;
  dues?: number;
  return?: number;
  discountAdvance?: number;
  netBalance?: number;
  chqCashIssuedDate?: Date;
  amountPaid?: number;
  voucherClearedDate?: Date;
  remarks?: string;
  status?: "pending" | "active" | 'cancel';
  voucherBook?: string;
}

const VoucherEntrySchema = new Schema<IVoucherEntry>(
  {
    branchId: { type: String, trim: true },
    voucherNo: { type: String, trim: true },
    invoiceNo: { type: String, trim: true },
    voucherGivenDate: { type: Date },
    supplier: { type: String, trim: true },
    amount: { type: Number },
    dues: { type: Number },
    return: { type: Number },
    discountAdvance: { type: Number },
    netBalance: { type: Number },
    chqCashIssuedDate: { type: Date },
    amountPaid: { type: Number },
    voucherClearedDate: { type: Date },
    remarks: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "active", 'cancel'],
      default: "pending",
    },
    voucherBook: { type: String, trim: true },
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
