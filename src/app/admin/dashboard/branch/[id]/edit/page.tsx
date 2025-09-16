"use client";
import { useState } from "react";
import * as React from "react";
import {
  User,
  Lock,
  MapPin,
  Receipt,
  Plus,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { toast, Toaster } from "sonner";

interface Voucher {
  name: string;
  start: string;
  end: string;
}

interface FormData {
  branchName: string;
  username: string;
  password: string;
  vouchers: Voucher[];
}

export default function Page() {
  const { id: editbranch } = useParams<{ id: string }>();

  const [formData, setFormData] = useState<FormData>({
    branchName: "",
    username: "",
    password: "",
    vouchers: [],
  });
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const router = useRouter();

  // Load existing branch data for editing
  React.useEffect(() => {
    const run = async () => {
      try {
        if (!editbranch) return;
        const res = await fetch(`/api/branch/${editbranch}`);
        if (!res.ok) return;
        const branch = await res.json();
        setFormData({
          branchName: String(branch.branchName ?? ""),
          username: String(branch.username ?? ""),
          password: String(branch.password ?? ""),
          vouchers: Array.isArray(branch.vouchers)
            ? branch.vouchers.map((v: Record<string, unknown>) => ({
                name: String(v.name ?? ""),
                start: v.start != null ? String(v.start) : "",
                end: v.end != null ? String(v.end) : "",
              }))
            : [],
        });
      } catch {
        // ignore
      }
    };
    run();
  }, [editbranch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleVoucherChange = (
    index: number,
    field: keyof Voucher,
    value: string
  ) => {
    const updatedVouchers = [...formData.vouchers];
    updatedVouchers[index][field] = value;
    setFormData((prev) => ({
      ...prev,
      vouchers: updatedVouchers,
    }));
    setError("");
  };

  const addVoucher = () => {
    setFormData((prev) => ({
      ...prev,
      vouchers: [...prev.vouchers, { name: "", start: "", end: "" }],
    }));
  };

  const deleteVoucher = async (index: number) => {
    setIsDeleting(index);
    setError("");

    try {
      const res = await fetch(`/api/branch`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: editbranch,
          action: "deleteVoucher",
          voucherIndex: index,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(String(data.error || "Failed to delete voucher"));
        toast.error(String(data.error || "Failed to delete voucher"));
        return;
      }

      // Remove the voucher from local state
      const updatedVouchers = formData.vouchers.filter((_, i) => i !== index);
      setFormData((prev) => ({
        ...prev,
        vouchers: updatedVouchers,
      }));

      toast.success("Voucher deleted successfully!");
    } catch (error) {
      console.error("Error deleting voucher:", error);
      setError("Something went wrong while deleting the voucher");
      toast.error("Something went wrong while deleting the voucher");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeleteVoucher = (index: number) => {
    deleteVoucher(index);
  };

  const validateForm = (): boolean => {
    if (!formData.branchName.trim()) {
      setError("Branch name is required");
      return false;
    }
    if (!formData.username.trim()) {
      setError("Username is required");
      return false;
    }
    if (!formData.password.trim()) {
      setError("Password is required");
      return false;
    }

    // Filter out empty vouchers before validation
    const nonEmptyVouchers = formData.vouchers.filter(
      (voucher) => voucher.name.trim() || voucher.start || voucher.end
    );

    // If there are no vouchers at all, that's fine - allow update without vouchers
    if (nonEmptyVouchers.length === 0) {
      return true;
    }

    // Validate only non-empty vouchers
    for (let i = 0; i < nonEmptyVouchers.length; i++) {
      const voucher = nonEmptyVouchers[i];

      // If any field is filled, all fields must be filled
      if (!voucher.name.trim()) {
        setError(`Voucher ${i + 1} name is required`);
        return false;
      }
      if (!voucher.start || !voucher.end) {
        setError(`Voucher ${i + 1} range is required`);
        return false;
      }

      const start = parseInt(voucher.start);
      const end = parseInt(voucher.end);
      if (isNaN(start) || isNaN(end) || start < 1 || end < 1 || start > end) {
        setError(
          `Voucher ${i + 1} has invalid range. Start must be ≥ 1 and ≤ end`
        );
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (): Promise<void> => {
    setError("");
    setSuccess("");

    if (!validateForm()) return;

    try {
      // Filter out empty vouchers before sending to API
      const validVouchers = formData.vouchers.filter(
        (voucher) => voucher.name.trim() || voucher.start || voucher.end
      );

      const res = await fetch(`/api/branch/${editbranch}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: editbranch,
          branchName: formData.branchName,
          username: formData.username,
          password: formData.password,
          vouchers: validVouchers,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(String(data.error || "Failed to update branch"));
        return;
      }

      setSuccess("Branch updated successfully!");
      toast.success("Branch updated successfully!");

      router.push("/admin/dashboard");
    } catch {
      setError("Something went wrong while updating the branch");
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-start justify-center p-6">
      <Toaster position="top-right" expand={true} />

      <div className="w-full max-w-5xl">
        <div className="mb-8">
          <h2 className="text-3xl font-heading font-semibold text-gray-900 mb-1">
            Edit Branch
          </h2>
          <p className="text-sm text-gray-600 font-sans">
            Enter branch details to continue
          </p>
        </div>

        <div className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="rounded-md border border-green-300 bg-green-50 text-green-700 px-3 py-2 text-sm">
              {success}
            </div>
          )}

          {/* Two-column layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: Branch, Username, Password */}
            <div className="space-y-4">
              {/* Branch Name Field */}
              <div className="relative">
                <label
                  htmlFor="branchName"
                  className="block text-sm font-heading font-medium text-gray-700 mb-1"
                >
                  Branch Name
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    id="branchName"
                    name="branchName"
                    value={formData.branchName}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-base"
                    placeholder="Enter branch name"
                  />
                </div>
              </div>

              {/* Username Field */}
              <div className="relative">
                <label
                  htmlFor="username"
                  className="block text-sm font-heading font-medium text-gray-700 mb-1"
                >
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-base"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="relative">
                <label
                  htmlFor="password"
                  className="block text-sm font-heading font-medium text-gray-700 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-base"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Vouchers and Submit */}
            <div className="space-y-4">
              {/* Vouchers Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-heading font-medium text-gray-700">
                    Vouchers
                  </label>
                  <button
                    type="button"
                    onClick={addVoucher}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs border border-blue-200 text-blue-700 rounded-md hover:bg-blue-50 transition-colors font-heading font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-3">
                  {formData.vouchers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm font-sans">
                      No vouchers added yet. Click &quot;Add&quot; to create
                      voucher books.
                    </div>
                  ) : (
                    formData.vouchers.map((voucher, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-heading font-medium text-gray-600">
                            Voucher {index + 1}
                          </span>
                          <ConfirmDialog
                            triggerLabel={
                              isDeleting === index ? (
                                <div className="w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <X className="w-3 h-3" />
                              )
                            }
                            title="Delete Voucher"
                            description={`Are you sure you want to delete "${
                              formData.vouchers[index].name ||
                              `Voucher ${index + 1}`
                            }"? This action cannot be undone.`}
                            confirmLabel="Delete"
                            cancelLabel="Cancel"
                            onConfirm={() => handleDeleteVoucher(index)}
                            permission={true}
                            disabled={isDeleting === index}
                          />
                        </div>

                        {/* Voucher Name */}
                        <div className="relative">
                          <Receipt className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                          <input
                            type="text"
                            value={voucher.name}
                            onChange={(e) =>
                              handleVoucherChange(index, "name", e.target.value)
                            }
                            className="w-full pl-7 pr-2 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-base"
                            placeholder="Name (e.g., ABC)"
                          />
                        </div>

                        {/* Voucher Range */}
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            min="1"
                            value={voucher.start}
                            onChange={(e) =>
                              handleVoucherChange(
                                index,
                                "start",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-base text-center"
                            placeholder="Start"
                          />
                          <input
                            type="number"
                            min="1"
                            value={voucher.end}
                            onChange={(e) =>
                              handleVoucherChange(index, "end", e.target.value)
                            }
                            className="w-full px-2 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus-border-transparent outline-none transition-all duration-200 text-base text-center"
                            placeholder="End"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-heading font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 text-base"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
