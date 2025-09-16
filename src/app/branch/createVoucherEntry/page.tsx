"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";

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
      if (!formData.voucherGivenDate) {
        toast.error("Please select a Voucher Given Date.");
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

      if (!formData.remarks || !formData.remarks.trim()) {
        toast.error("Please enter remarks.");
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
        voucherGivenDate: formData.voucherGivenDate,
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

      setNextNumber(null);
      setFormData(initialFormData);
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

  return (
    <div className="min-h-screen bg-transparent py-12 px-6">
      <Toaster position="top-right" expand={true} />

      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-semibold text-gray-900 mb-8">
          Create New Voucher
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
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
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                await handleInputChange(
                  "voucherNo",
                  e.target.value ?? nextNumber
                );
              }}
              disabled={!formData.voucherBookRange}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value={nextNumber ?? ""}>
                {nextNumber !== null
                  ? String(nextNumber)
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
              type="number"
              value={formData.invoiceNo}
              onChange={async (e) =>
                await handleInputChange("invoiceNo", e.target.value)
              }
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter invoice number"
            />
          </div>

          {/* Voucher Given Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voucher Given Date
            </label>
            <input
              type="date"
              value={formData.voucherGivenDate}
              onChange={async (e) =>
                await handleInputChange("voucherGivenDate", e.target.value)
              }
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier
            </label>
            <div className="flex gap-3">
              <select
                value={formData.supplier}
                onChange={async (e) =>
                  await handleInputChange("supplier", e.target.value)
                }
                className="flex-1 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="px-4 py-3 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 focus:ring-2 focus:ring-green-500 text-sm font-medium"
                title="Add new supplier"
              >
                +
              </button>
            </div>

            {/* Add Supplier Form */}
            {showAddSupplier && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg border">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="Enter supplier name"
                    className="flex-1 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleAddSupplier();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddSupplier}
                    className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSupplier(false);
                      setNewSupplierName("");
                    }}
                    className="px-5 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-300 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mode of Payment moved to edit page */}

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
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remarks
            </label>
            <textarea
              value={formData.remarks}
              onChange={async (e) =>
                await handleInputChange("remarks", e.target.value)
              }
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter remarks"
              rows={3}
            />
          </div>

        
        </div>

        {/* Submit Button */}
        <div className="mt-10 flex justify-end gap-4">
          <button
            onClick={() => {
              setFormData(initialFormData);
              router.push("/");
            }}
            className="px-6 py-3 rounded-lg border text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save Voucher"}
          </button>
        </div>
      </div>
    </div>
  );
}
