"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import {
  ArrowLeft,
  Receipt,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  Building,
  User,
  Hash,
} from "lucide-react";

interface VoucherFormData {
  voucherBookRange: string;
  voucherNo: string;
  invoiceNo: string;
  voucherGivenDate: string;
  supplier: string;
  amount: number;
  remarks: string;
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
  voucherGivenDate: "",
  supplier: "",
  amount: 0,
  remarks: "",
};

export default function CreateVoucherPage() {
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
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const getTodayLocalDate = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  useEffect(() => {
    inputRef.current?.focus();

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
        const res = await fetch(`/api/branch/${branchIdFromStorage}`);
        if (res.ok) {
          const branchData = await res.json();

          // Load vouchers from API response
          const vouchers = Array.isArray(branchData?.vouchers)
            ? branchData.vouchers
            : [];
          const mapped: VoucherBook[] = vouchers
            .filter(
              (v: Record<string, unknown>) =>
                v &&
                typeof v.name === "string" &&
                typeof v.start === "number" &&
                typeof v.end === "number"
            )
            .map((v: Record<string, unknown>) => ({
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
              (v: Record<string, unknown>) => v.name === value
            );
            if (voucherBook?.usedVouchers) {
              const usedNumbers = voucherBook.usedVouchers
                .map((v: string) => parseInt(v, 10))
                .filter((n: number) => !isNaN(n));
              setReservedNumbers(usedNumbers);
              // Calculate next available number and hide if beyond end range
              const startRange = selectedBook.startRange;
              const endRange = selectedBook.endRange;
              const candidateNext = usedNumbers.length
                ? Math.max(...usedNumbers) + 1
                : startRange;

              const finalNextNumber =
                candidateNext > endRange ? null : candidateNext;

              setNextNumber(finalNextNumber);
              setFormData((prev) => ({
                ...prev,
                voucherNo: finalNextNumber ? String(finalNextNumber) : "",
              }));
            } else {
              setReservedNumbers([]);
              // If no used numbers, suggest the start of the range
              setNextNumber(selectedBook.startRange);
              setFormData((prev) => ({
                ...prev,
                voucherNo: String(selectedBook.startRange),
              }));
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

    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      if (!branchId) {
        toast.error("Missing branch ID. Please log in again.");
        return;
      }
      // Basic required checks
      if (!formData.voucherBookRange) {
        toast.error("Please select a Voucher Book.");
        return;
      }
      if (!formData.voucherNo) {
        toast.error("Please select a Voucher Number.");
        return;
      }

      if (!formData.supplier) {
        toast.error("Please select a Supplier.");
        return;
      }

      // New validations for Invoice No, Amount and Remarks
      if (!String(formData.invoiceNo).trim()) {
        toast.error("Please enter an Invoice No.");
        return;
      }

      if (!formData.amount || Number(formData.amount) <= 0) {
        toast.error("Amount must be greater than 0.");
        return;
      }

      // Validate voucher number is within the selected book range
      const selectedBook = voucherBookOptions.find(
        (book) => book.name === formData.voucherBookRange
      );
      if (!selectedBook) {
        toast.error("Invalid Voucher Book selection.");
        return;
      }

      const proposedVoucherNo: number | null = formData.voucherNo
        ? parseInt(formData.voucherNo, 10)
        : nextNumber;

      if (
        proposedVoucherNo === null ||
        Number.isNaN(proposedVoucherNo) ||
        proposedVoucherNo < selectedBook.startRange ||
        proposedVoucherNo > selectedBook.endRange
      ) {
        toast.error(
          `Voucher number must be between ${selectedBook.startRange} and ${selectedBook.endRange}.`
        );
        return;
      }

      const payload = {
        branchId,
        voucherBookName: formData.voucherBookRange,
        voucherNo: String(proposedVoucherNo),
        invoiceNo: formData.invoiceNo,
        voucherGivenDate: formData.voucherGivenDate || getTodayLocalDate(),
        supplier: formData.supplier,
        amount: formData.amount,
        // other fields will be defaulted in API
        remarks: formData.remarks || "",
        status: "pending",
      };

      const res = await fetch("/api/voucherEntry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data?.success === false) {
        toast.error(
          data?.error || `Failed to save voucher (HTTP ${res.status})`
        );
        return;
      }

      toast.success("Voucher saved successfully");

      // After saving, preserve the selected book and advance to next available number
      setFormData((prev) => ({
        ...initialFormData,
        voucherBookRange: prev.voucherBookRange,
        voucherNo: prev.voucherNo,
      }));
      const nextNum = await refreshNextNumberForSelectedBook(
        formData.voucherBookRange
      );
      if (nextNum) {
        setFormData((prev) => ({ ...prev, voucherNo: String(nextNum) }));
      }
      inputRef.current?.focus();
    } catch {
      toast.error("Error saving voucher. Please try again.");
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
          toast.success(" successfully");

          // Reset form
          setNewSupplierName("");
          setShowAddSupplier(false);
        } else {
          toast.error("Failed to add supplier. Please try again.");
        }
      } catch (error) {
        console.error("Error adding supplier:", error);
        toast.error("Error adding supplier. Please try again.");
      }
    }
  };

  const refreshNextNumberForSelectedBook = async (
    bookName: string
  ): Promise<number | null> => {
    if (!branchId || !bookName) return null;
    try {
      const res = await fetch(`/api/branch/${branchId}`);
      if (!res.ok) return null;
      const branchData = await res.json();
      const voucherBook = branchData.vouchers?.find(
        (v: Record<string, unknown>) => v.name === bookName
      );
      if (!voucherBook) return null;

      const usedNumbers = (voucherBook.usedVouchers || [])
        .map((v: string) => parseInt(v, 10))
        .filter((n: number) => !isNaN(n));
      setReservedNumbers(usedNumbers);

      const selectedBook = voucherBookOptions.find((b) => b.name === bookName);
      if (!selectedBook) return null;

      const candidateNext = usedNumbers.length
        ? Math.max(...usedNumbers) + 1
        : selectedBook.startRange;
      const finalNextNumber =
        candidateNext > selectedBook.endRange ? null : candidateNext;
      setNextNumber(finalNextNumber);
      return finalNextNumber;
    } catch {
      return null;
    }
  };

  const isFormValid = () => {
    return (
      Boolean(formData.voucherBookRange) &&
      Boolean(formData.voucherNo) &&
      Boolean(formData.supplier) &&
      Boolean(String(formData.invoiceNo).trim()) &&
      Number(formData.amount) > 0
    );
  };

  const getFormProgress = () => {
    const fields = [
      Boolean(formData.voucherBookRange),
      Boolean(formData.voucherNo),
      Boolean(formData.supplier),
      Boolean(String(formData.invoiceNo).trim()),
      Number(formData.amount) > 0,
    ];
    const filledFields = fields.filter(Boolean).length;
    return (filledFields / fields.length) * 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12 px-6">
      <Toaster position="top-right" expand={true} />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Receipt className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Create New Voucher
                </h1>
                <p className="text-gray-600 mt-1">
                  Fill in the details to generate a new voucher
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-white hover:shadow-md rounded-xl transition-all duration-200 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Back to Dashboard</span>
            </button>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${getFormProgress()}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            {/* Voucher Book Range */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Building className="h-4 w-4 text-blue-500" />
                Voucher Book Range <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.voucherBookRange}
                onChange={async (e) =>
                  await handleInputChange("voucherBookRange", e.target.value)
                }
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm group-hover:border-gray-300"
              >
                <option value="">Select a Voucher Book</option>
                {voucherBookOptions.map((book) => (
                  <option key={book.name} value={book.name}>
                    {book.name} ({book.startRange}-{book.endRange})
                  </option>
                ))}
              </select>
              {formData.voucherBookRange && (
                <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" /> Book selected successfully
                </div>
              )}
            </div>

            {/* Voucher No */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Hash className="h-4 w-4 text-indigo-500" />
                Voucher Number <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.voucherNo}
                onChange={async (e) => {
                  await handleInputChange(
                    "voucherNo",
                    e.target.value ?? nextNumber
                  );
                }}
                disabled={!formData.voucherBookRange}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-white/50 backdrop-blur-sm disabled:bg-gray-100 disabled:cursor-not-allowed group-hover:border-gray-300"
              >
                <option value={nextNumber ?? ""}>
                  {nextNumber !== null
                    ? `${nextNumber} (Next Available)`
                    : formData.voucherBookRange
                    ? "Please Select Voucher number"
                    : "Select Voucher Book First"}
                </option>
                {formData.voucherBookRange &&
                  getVoucherNumbers(formData.voucherBookRange).map((number) => {
                    voucherBookOptions.find(
                      (b) => b.name === formData.voucherBookRange
                    );
                    const num = parseInt(number, 10);
                    const disableForThisBook = reservedNumbers.includes(num);
                    return (
                      <option
                        key={number}
                        value={number}
                        disabled={disableForThisBook}
                      >
                        {number} {disableForThisBook ? "(used)" : ""}
                      </option>
                    );
                  })}
              </select>
              {nextNumber && (
                <div className="mt-2 flex items-center gap-1 text-sm text-blue-600">
                  <AlertCircle className="h-4 w-4" /> Suggested: #{nextNumber}
                </div>
              )}
            </div>

            {/* Invoice No */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <FileText className="h-4 w-4 text-green-500" /> Invoice Number
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.invoiceNo}
                onChange={async (e) =>
                  await handleInputChange("invoiceNo", e.target.value)
                }
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200 bg-white/50 backdrop-blur-sm group-hover:border-gray-300"
                placeholder="Enter invoice number"
                ref={inputRef}
              />
            </div>

            {/* Voucher Given Date */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Calendar className="h-4 w-4 text-purple-500" /> Voucher Given
                Date
              </label>
              <input
                type="date"
                value={formData.voucherGivenDate || getTodayLocalDate()}
                onChange={async (e) =>
                  await handleInputChange("voucherGivenDate", e.target.value)
                }
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 bg-white/50 backdrop-blur-sm group-hover:border-gray-300"
              />
            </div>

            {/* Supplier */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <User className="h-4 w-4 text-orange-500" /> Supplier
                <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <select
                  value={formData.supplier}
                  onChange={async (e) =>
                    await handleInputChange("supplier", e.target.value)
                  }
                  className="flex-1 px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200 bg-white/50 backdrop-blur-sm group-hover:border-gray-300"
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
                  className="px-4 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:scale-105 focus:ring-4 focus:ring-green-100 transition-all duration-200 group"
                  title="Add new supplier"
                >
                  <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              {/* Add Supplier Form */}
              {showAddSupplier && (
                <div className="mt-4 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                  <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                    <Plus className="h-5 w-5" /> Add New Supplier
                  </h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      placeholder="Enter supplier name"
                      className="flex-1 px-4 py-3 border-2 border-green-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 bg-white"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleAddSupplier();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddSupplier}
                      className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 font-medium"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddSupplier(false);
                        setNewSupplierName("");
                      }}
                      className="px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:ring-4 focus:ring-gray-100 transition-all duration-200"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mode of Payment moved to edit page */}

            {/* Amount */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <DollarSign className="h-4 w-4 text-green-600" /> Amount
                <span className="text-red-500">*</span>
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
                className="w-full pl-10 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200 bg-white/50 backdrop-blur-sm group-hover:border-gray-300"
                placeholder="0.00"
              />
              {formData.amount > 0 && (
                <div className="mt-2 text-sm text-green-600 font-medium">
                  Amount: ₹{formData.amount.toLocaleString("en-IN")}
                </div>
              )}
            </div>

            {/* Remarks */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <FileText className="h-4 w-4 text-gray-500" /> Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={async (e) =>
                  await handleInputChange("remarks", e.target.value)
                }
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-gray-100 focus:border-gray-500 transition-all duration-200 bg-white/50 backdrop-blur-sm resize-none group-hover:border-gray-300"
                placeholder="Enter any additional remarks or notes..."
                rows={4}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-10 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isLoading || !isFormValid()}
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 focus:ring-4 focus:ring-blue-200"
            >
              <div className="flex items-center gap-3">
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Voucher...
                  </>
                ) : (
                  <>
                    <Receipt className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                    Create Voucher
                  </>
                )}
              </div>
              {!isFormValid() && !isLoading && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-red-500 whitespace-nowrap">
                  Please fill all required fields
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Summary */}
        {isFormValid() && (
          <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" /> Voucher Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Book:</span>
                <p className="font-semibold text-gray-800">
                  {formData.voucherBookRange}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Number:</span>
                <p className="font-semibold text-gray-800">
                  #{formData.voucherNo}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Supplier:</span>
                <p className="font-semibold text-gray-800">
                  {formData.supplier}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Amount:</span>
                <p className="font-semibold text-green-600">
                  ₹{formData.amount.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
