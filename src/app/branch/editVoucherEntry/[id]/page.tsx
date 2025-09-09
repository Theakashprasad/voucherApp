"use client";
import React, { useEffect, useState } from "react";
import { number } from "zod";
import { useRouter } from "next/navigation";

interface VoucherFormData {
  voucherBookRange: string;
  voucherNo: string;
  invoiceNo: string;
  date: string;
  supplier: string;
  amount: number;
  dues: number;
  return: number;
  discountAdvance: number;
  netBalance: number;
  modeOfPayment: string;
  chqCashIssuedDate: string;
  amountPaid: number;
  voucherClearedDate: string;
}

interface FormErrors {
  [key: string]: string;
}

interface VoucherBook {
  name: string;
  startRange: number;
  endRange: number;
}

const initialFormData: VoucherFormData = {
  voucherBookRange: "",
  voucherNo: "",
  invoiceNo: "",
  date: "",
  supplier: "",
  amount: 0,
  dues: 0,
  return: 0,
  discountAdvance: 0,
  netBalance: 0,
  modeOfPayment: "",
  chqCashIssuedDate: "",
  amountPaid: 0,
  voucherClearedDate: "",
};

export default function CreateVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [formData, setFormData] = useState<VoucherFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [voucherBookOptions, setVoucherBookOptions] = useState<VoucherBook[]>(
    []
  );
  const [branchId, setBranchId] = useState<string | null>(null);
  const [reservedNumbers, setReservedNumbers] = useState<number[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<string[]>([]);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [nextNumber, setNextNumber] = useState<number | null>(null);
  const [originalVoucherBookName, setOriginalVoucherBookName] = useState<
    string | null
  >(null);
  const [originalVoucherNo, setOriginalVoucherNo] = useState<string | null>(
    null
  );
  const router = useRouter();

  const { id } = React.use(params); // ✅ unwrap the Promise
  const voucherId = id;
  useEffect(() => {
    const loadBranchData = async () => {
      try {
        // Get branch ID from localStorage
        const raw = localStorage.getItem("branchDetails");
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const branchIdFromStorage =
          typeof parsed?._id === "string" ? parsed._id : null;

        if (!branchIdFromStorage) return;

        setBranchId(branchIdFromStorage);

        // Fetch all branch data from API
        // const res = await fetch(`/api/user/branch/${branchIdFromStorage}`);
        const [branchRes, voucherRes] = await Promise.all([
          fetch(`/api/branch/${branchIdFromStorage}`),
          fetch(
            `/api/voucherEntry?branchId=${branchIdFromStorage}&voucherId=${voucherId}`
          ),
        ]);
        const a = await voucherRes.json();
        console.log("voucherRes", a);
        if (branchRes.ok) {
          const branchData = await branchRes.json();
          console.log("Branch data from API:", branchData);

          // Load vouchers from API response
          const vouchers = Array.isArray(branchData?.vouchers)
            ? branchData.vouchers
            : [];
          const mapped: VoucherBook[] = vouchers
            .filter(
              (v: any) =>
                v &&
                typeof v.name === "string" &&
                typeof v.start === "number" &&
                typeof v.end === "number"
            )
            .map((v: any) => ({
              name: v.name,
              startRange: v.start,
              endRange: v.end,
            }));
          setVoucherBookOptions(mapped);

          // Load suppliers from API response
          if (branchData?.Supplier && Array.isArray(branchData.Supplier)) {
            setSupplierOptions([...branchData.Supplier]);
          } else {
            setSupplierOptions([]);
          }
          // Populate form with fetched voucher data (edit mode)
          if (Array.isArray(a) && a.length > 0) {
            const v = a[0];
            // Preload reserved numbers for current voucher book without overriding voucherNo
            if (v?.voucherBook && Array.isArray(branchData?.vouchers)) {
              const vb = branchData.vouchers.find(
                (x: any) => x?.name === v.voucherBook
              );
              if (vb?.usedVouchers) {
                const usedNumbers = vb.usedVouchers
                  .map((u: string) => parseInt(u, 10))
                  .filter((n: number) => !isNaN(n));
                setReservedNumbers(usedNumbers);
                const nextNumbervalue = usedNumbers.length
                  ? Math.max(...usedNumbers) + 1
                  : null;
                setNextNumber(nextNumbervalue);
              } else {
                setReservedNumbers([]);
              }
            }
            setFormData((prev) => ({
              ...prev,
              voucherBookRange: v?.voucherBook || "",
              voucherNo: v?.voucherNo || "",
              invoiceNo: v?.remarks || "",
              date: v?.date ? new Date(v.date).toISOString().slice(0, 10) : "",
              supplier: v?.supplier || "",
              amount: Number(v?.amount ?? 0),
              dues: Number(v?.dues ?? 0),
              return: Number(v?.return ?? 0),
              discountAdvance: Number(v?.discountAdvance ?? 0),
              netBalance: Number(v?.netBalance ?? 0),
              modeOfPayment: v?.modeOfPayment || "",
              chqCashIssuedDate: v?.chqCashIssuedDate
                ? new Date(v.chqCashIssuedDate).toISOString().slice(0, 10)
                : "",
              amountPaid: Number(v?.amountPaid ?? 0),
              voucherClearedDate: v?.voucherClearedDate
                ? new Date(v.voucherClearedDate).toISOString().slice(0, 10)
                : "",
            }));
            setOriginalVoucherBookName(v?.voucherBook || null);
            setOriginalVoucherNo(v?.voucherNo || null);
          }
        } else {
          console.error("Failed to fetch branch data");
          setSupplierOptions([]);
        }
      } catch (e) {
        console.error("Error loading branch data:", e);
        setSupplierOptions([]);
      }
    };

    loadBranchData();
  }, []);
  // Generate voucher numbers based on selected book range
  const getVoucherNumbers = (bookRange: string) => {
    const selectedBook = voucherBookOptions.find(
      (book) => book.name === bookRange
    );
    if (!selectedBook) return [];

    const numbers = [];
    for (let i = selectedBook.startRange; i <= selectedBook.endRange; i++) {
      numbers.push(i.toString());
    }
    return numbers;
  };

  const handleInputChange = async (
    field: keyof VoucherFormData,
    value: string | number
  ) => {
    // Reset voucher number when book range changes and update reserved numbers
    if (field === "voucherBookRange") {
      // Find the selected voucher book and get its usedVouchers
      const selectedBook = voucherBookOptions.find(
        (book) => book.name === value
      );

      if (selectedBook && branchId) {
        // Get the full branch details from API to access usedVouchers
        try {
          const res = await fetch(`/api/branch/${branchId}`);
          if (res.ok) {
            const branchData = await res.json();
            const voucherBook = branchData.vouchers?.find(
              (v: any) => v.name === value
            );
            if (voucherBook?.usedVouchers) {
              const usedNumbers = voucherBook.usedVouchers
                .map((v: string) => parseInt(v, 10))
                .filter((n: number) => !isNaN(n));
              setReservedNumbers(usedNumbers);
              // Calculate maxReserved based on current reservedNumbers
              const nextNumbervalue = usedNumbers.length
                ? Math.max(...usedNumbers) + 1
                : null;
              console.log("sdsd", nextNumbervalue);
              setNextNumber(nextNumbervalue);
              // Only auto-set voucher number if it's currently empty
              setFormData((prev) => ({
                ...prev,
                voucherNo: prev.voucherNo
                  ? prev.voucherNo
                  : String(nextNumbervalue ?? ""),
              }));
            } else {
              setReservedNumbers([]);
            }
          } else {
            setReservedNumbers([]);
          }
        } catch (e) {
          console.error("Error fetching branch data for reserved numbers:", e);
          setReservedNumbers([]);
        }
      } else {
        setReservedNumbers([]);
      }
    }

    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      if (["amount", "dues", "return", "discountAdvance"].includes(field)) {
        const amount =
          field === "amount" ? Number(value) : Number(updated.amount);
        const dues = field === "dues" ? Number(value) : Number(updated.dues);
        const returnAmount =
          field === "return" ? Number(value) : Number(updated.return);
        const discountAdvance =
          field === "discountAdvance"
            ? Number(value)
            : Number(updated.discountAdvance);

        updated.netBalance = amount - dues - returnAmount - discountAdvance;
      }

      return updated;
    });

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      if (!branchId) {
        alert("Missing branch ID. Please log in again.");
        return;
      }
      // Basic required checks
      if (!formData.voucherBookRange) {
        alert("Please select a Voucher Book.");
        return;
      }
      if (!formData.voucherNo) {
        alert("Please select a Voucher Number.");
        return;
      }
      if (!formData.date) {
        alert("Please select a Date.");
        return;
      }
      if (!formData.supplier) {
        alert("Please select a Supplier.");
        return;
      }

      const payload = {
        branchId,
        voucherBookName: formData.voucherBookRange,
        voucherNo: formData.voucherNo ?? nextNumber,
        previousVoucherBookName: originalVoucherBookName,
        previousVoucherNo: originalVoucherNo,
        date: formData.date,
        voucherGivenDate: formData.date,
        supplier: formData.supplier,
        amount: formData.amount,
        dues: formData.dues,
        return: formData.return,
        discountAdvance: formData.discountAdvance,
        netBalance: formData.netBalance,
        modeOfPayment: (formData.modeOfPayment || "CASH").toUpperCase(),
        chqCashIssuedDate: formData.chqCashIssuedDate || null,
        amountPaid: formData.amountPaid,
        voucherClearedDate: formData.voucherClearedDate || null,
        remarks: formData.invoiceNo || "",
        status: formData.voucherClearedDate ? "active" : "pending",
      };

      const res = await fetch(`/api/voucherEntry`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, voucherEntryId: voucherId }),
      });

      const data = await res.json();
      if (!res.ok || data?.success === false) {
        alert(data?.error || `Failed to save voucher (HTTP ${res.status})`);
        return;
      }

      alert("Voucher updated successfully!");
      setFormData(initialFormData);
    } catch (error) {
      alert("Error saving voucher. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSupplier = async () => {
    if (
      newSupplierName.trim() &&
      !supplierOptions?.includes(newSupplierName.trim())
    ) {
      try {
        // Add to backend first
        const res = await fetch("/api/branch", {
          method: "PATCH",
          body: JSON.stringify({
            branchId,
            newSupplierName: newSupplierName.trim(),
          }),
          headers: { "Content-Type": "application/json" },
        });

        if (res.ok) {
          // Update local state only if backend call succeeds
          const updatedSuppliers = [...supplierOptions, newSupplierName.trim()];
          setSupplierOptions(updatedSuppliers);

          // Set the new supplier as selected
          await handleInputChange("supplier", newSupplierName.trim());

          // Reset form
          setNewSupplierName("");
          setShowAddSupplier(false);
        } else {
          alert("Failed to add supplier. Please try again.");
        }
      } catch (error) {
        console.error("Error adding supplier:", error);
        alert("Error adding supplier. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-8">
          Create New Voucher
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {/* Voucher Book Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voucher Book Range
            </label>
            <select
              value={formData.voucherBookRange}
              onChange={async (e) =>
                await handleInputChange("voucherBookRange", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a Voucher Book</option>
              {voucherBookOptions.map((book) => (
                <option key={book.name} value={book.name}>
                  {book.name} ({book.startRange}-{book.endRange})
                </option>
              ))}
            </select>
          </div>

          {/* Voucher No */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voucher No.
            </label>
            <select
              value={formData.voucherNo}
              onChange={async (e) => {
                console.log("asdf", e.target.value);
                await handleInputChange(
                  "voucherNo",
                  e.target.value ?? nextNumber
                );
              }}
              disabled={!formData.voucherBookRange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value={nextNumber ?? ""}>
                {nextNumber !== null
                  ? String(nextNumber)
                  : formData.voucherBookRange
                  ? "Select Voucher Number"
                  : "Select Voucher Book First"}
              </option>
              {formData.voucherBookRange &&
                getVoucherNumbers(formData.voucherBookRange).map((number) => {
                  const selectedBook = voucherBookOptions.find(
                    (b) => b.name === formData.voucherBookRange
                  );
                  const num = parseInt(number, 10);
                  const disableForThisBook =
                    reservedNumbers.includes(num) &&
                    String(num) !== formData.voucherNo;
                  return (
                    <option
                      key={number}
                      value={number}
                      disabled={disableForThisBook}
                    >
                      {number}
                      {disableForThisBook ? " (used)" : ""}
                    </option>
                  );
                })}
            </select>
          </div>

          {/* Invoice No */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice No.
            </label>
            <input
              type="text"
              value={formData.invoiceNo}
              onChange={async (e) =>
                await handleInputChange("invoiceNo", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Enter invoice number"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={async (e) =>
                await handleInputChange("date", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier
            </label>
            <div className="flex gap-2">
              <select
                value={formData.supplier}
                onChange={async (e) =>
                  await handleInputChange("supplier", e.target.value)
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a Supplier</option>
                {supplierOptions?.map((supplier) => (
                  <option key={supplier} value={supplier}>
                    {supplier}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddSupplier(!showAddSupplier)}
                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 text-sm font-medium"
                title="Add new supplier"
              >
                +
              </button>
            </div>

            {/* Add Supplier Form */}
            {showAddSupplier && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="Enter supplier name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleAddSupplier();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddSupplier}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSupplier(false);
                      setNewSupplierName("");
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mode of Payment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mode of Payment
            </label>
            <input
              type="text"
              value={formData.modeOfPayment}
              onChange={async (e) =>
                await handleInputChange("modeOfPayment", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Enter mode of payment"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.amount || ""}
              onChange={async (e) =>
                await handleInputChange(
                  "amount",
                  parseFloat(e.target.value) || 0
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          {/* Dues */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dues
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.dues || ""}
              onChange={async (e) =>
                await handleInputChange("dues", parseFloat(e.target.value) || 0)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          {/* Return */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Return
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.return || ""}
              onChange={async (e) =>
                await handleInputChange(
                  "return",
                  parseFloat(e.target.value) || 0
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          {/* Discount/Advance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount / Advance
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.discountAdvance || ""}
              onChange={async (e) =>
                await handleInputChange(
                  "discountAdvance",
                  parseFloat(e.target.value) || 0
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          {/* Net Balance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Net Balance
            </label>
            <input
              type="number"
              value={formData.netBalance.toFixed(2)}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
            />
          </div>

          {/* Amount Paid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount Paid
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.amountPaid || ""}
              onChange={async (e) =>
                await handleInputChange(
                  "amountPaid",
                  parseFloat(e.target.value) || 0
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          {/* CHQ/Cash Issued Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CHQ / Cash Issued Date
            </label>
            <input
              type="date"
              value={formData.chqCashIssuedDate}
              onChange={async (e) =>
                await handleInputChange("chqCashIssuedDate", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Voucher Cleared Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voucher Cleared Date
            </label>
            <input
              type="date"
              value={formData.voucherClearedDate}
              onChange={async (e) =>
                await handleInputChange("voucherClearedDate", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={() => {
              setFormData(initialFormData);
              router.push("/");
            }}
            className="px-6 py-2 rounded-md border text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save Voucher"}
          </button>
        </div>
      </div>
    </div>
  );
}
