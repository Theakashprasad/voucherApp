"use client";
import { useState } from "react";
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
  const [formData, setFormData] = useState<FormData>({
    branchName: "",
    username: "",
    password: "",
    vouchers: [{ name: "", start: "", end: "" }],
  });
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

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

    for (let i = 0; i < formData.vouchers.length; i++) {
      const voucher = formData.vouchers[i];
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

    console.log("Form submitted:", formData);
    setSuccess("Form submitted successfully!");
    const res = await fetch("/api/branch", {
      method: "POST",
      body: JSON.stringify({ branchName: formData.branchName, username: formData.username, password: formData.password, vouchers: formData.vouchers }),
      headers: { "Content-Type": "application/json" },
    }); 
    // Reset form after successful submission
    setTimeout(() => {
      setFormData({
        branchName: "",
        username: "",
        password: "",
        vouchers: [{ name: "", start: "", end: "" }],
      });
      setSuccess("");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Create Branch
          </h2>
          <p className="text-sm text-gray-600">
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

          {/* Branch Name Field */}
          <div className="relative">
            <label
              htmlFor="branchName"
              className="block text-sm font-medium text-gray-700 mb-1"
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
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-sm"
                placeholder="Enter branch name"
              />
            </div>
          </div>

          {/* Username Field */}
          <div className="relative">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
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
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-sm"
                placeholder="Enter username"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="relative">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
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
                className="w-full pl-9 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-sm"
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

          {/* Vouchers Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Vouchers
              </label>
              <button
                type="button"
                onClick={addVoucher}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {formData.vouchers.map((voucher, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">
                      Voucher {index + 1}
                    </span>
                    {formData.vouchers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVoucher(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
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
                      className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-sm bg-white"
                      placeholder="Name (e.g., ABC)"
                    />
                  </div>

                  {/* Voucher Range */}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="1"
                      value={voucher.start}
                      onChange={(e) =>
                        handleVoucherChange(index, "start", e.target.value)
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-sm bg-white text-center"
                      placeholder="Start"
                    />
                    <input
                      type="number"
                      min="1"
                      value={voucher.end}
                      onChange={(e) =>
                        handleVoucherChange(index, "end", e.target.value)
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-sm bg-white text-center"
                      placeholder="End"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-md text-sm"
          >
            Create Branch
          </button>
        </div>
      </div>
    </div>
  );
}
