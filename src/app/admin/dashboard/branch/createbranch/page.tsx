"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
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

export default function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    branchName: "",
    username: "",
    password: "",
    vouchers: [],
  });
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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

  const removeVoucher = (index: number) => {
    if (formData.vouchers.length > 1) {
      const updatedVouchers = formData.vouchers.filter((_, i) => i !== index);
      setFormData((prev) => ({
        ...prev,
        vouchers: updatedVouchers,
      }));
    }
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

    // If there are no vouchers at all, that's fine - allow creation without vouchers
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
    setIsSubmitting(true);

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Filter out empty vouchers before sending to API
      const validVouchers = formData.vouchers.filter(
        (voucher) => voucher.name.trim() || voucher.start || voucher.end
      );

      const response = await fetch("/api/branch", {
        method: "POST",
        body: JSON.stringify({
          branchName: formData.branchName,
          username: formData.username,
          password: formData.password,
          vouchers: validVouchers,
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error || "Failed to create branch";
        setError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      await response.json();
      setSuccess("Branch created successfully!");
      toast.success("Branch created successfully!");

      // Reset form after successful submission
      setFormData({
        branchName: "",
        username: "",
        password: "",
        vouchers: [],
      });

      // Redirect to admin dashboard after a short delay
      router.push("/admin/dashboard");
    } catch (error) {
      console.error("Error creating branch:", error);
      const errorMessage = "Network error. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Toaster position="top-right" expand={true} />

      <div className="w-full p-6 py-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
              Create Branch
            </h2>
            <p className="text-sm text-gray-600">
              Enter branch details to continue
            </p>
          </div>

          <div className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-red-200 shadow-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <svg
                      className="h-4 w-4 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-green-200 shadow-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <svg
                      className="h-4 w-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-green-700">
                    {success}
                  </p>
                </div>
              </div>
            )}

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Branch, Username, Password */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-6 space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Branch Information
                    </h3>
                    <p className="text-sm text-gray-600">
                      Enter the basic branch details
                    </p>
                  </div>
                </div>

                {/* Branch Name Field */}
                <div className="relative">
                  <label
                    htmlFor="branchName"
                    className="block text-sm font-medium text-gray-700 mb-2"
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
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-base"
                      placeholder="Enter branch name"
                    />
                  </div>
                </div>

                {/* Username Field */}
                <div className="relative">
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-gray-700 mb-2"
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
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-base"
                      placeholder="Enter username"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="relative">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
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
                      className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-base"
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
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-6 space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl">
                    <Receipt className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Voucher Books
                    </h3>
                    <p className="text-sm text-gray-600">
                      Add voucher books for this branch
                    </p>
                  </div>
                </div>

                {/* Vouchers Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Vouchers
                    </label>
                    <button
                      type="button"
                      onClick={addVoucher}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:shadow-md hover:scale-105 transition-all duration-200 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Voucher
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-4">
                    {formData.vouchers.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-fit mx-auto mb-4">
                          <Receipt className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">
                          No vouchers added yet. Click &quot;Add Voucher&quot;
                          to create voucher books.
                        </p>
                      </div>
                    ) : (
                      formData.vouchers.map((voucher, index) => (
                        <div
                          key={index}
                          className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-200"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              Voucher {index + 1}
                            </span>
                            {formData.vouchers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeVoucher(index)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Voucher Name */}
                          <div className="relative">
                            <Receipt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              value={voucher.name}
                              onChange={(e) =>
                                handleVoucherChange(
                                  index,
                                  "name",
                                  e.target.value
                                )
                              }
                              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-base"
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
                              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-base text-center"
                              placeholder="Start"
                            />
                            <input
                              type="number"
                              min="1"
                              value={voucher.end}
                              onChange={(e) =>
                                handleVoucherChange(
                                  index,
                                  "end",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-base text-center"
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
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:shadow-md hover:scale-105 focus:ring-4 focus:ring-green-100 transition-all duration-200 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmitting ? "Creating Branch..." : "Create Branch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
