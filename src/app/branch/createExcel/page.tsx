"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  X,
} from "lucide-react";

interface VoucherData {
  voucherNo: string;
  voucherBook: string;
  invoiceNo?: string;
  voucherGivenDate: string;
  supplier: string;
  amount: number;
  dues: number;
  return: number;
  discountAdvance: number;
  amountPaid: number;
  chqCashIssuedDate?: string;
  voucherClearedDate?: string;
  remarks: string;
}

const ExcelUploaderUI = () => {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<(string | number)[][]>([]);
  const [voucherData, setVoucherData] = useState<VoucherData[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccess, setSendSuccess] = useState<boolean>(false);
  const [branchId, setBranchId] = useState<string>("");
  const [importResults, setImportResults] = useState<{
    createdCount?: number;
    skippedCount?: number;
    errorCount?: number;
  } | null>(null);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  // Load branch ID from localStorage on component mount
  const loadBranchId = () => {
    try {
      const raw = localStorage.getItem("branchDetails");
      if (raw) {
        const branchDetails = JSON.parse(raw);
        if (branchDetails._id) {
          setBranchId(branchDetails._id);
        }
      }
    } catch (err) {
      console.error("Error loading branch ID:", err);
    }
  };

  // Load branch ID on component mount
  React.useEffect(() => {
    loadBranchId();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);

      // If multiple files, take the first Excel file
      const excelFile = files.find((file) => {
        const allowedTypes = [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "text/csv",
        ];
        return (
          allowedTypes.includes(file.type) ||
          file.name.endsWith(".xlsx") ||
          file.name.endsWith(".xls") ||
          file.name.endsWith(".csv")
        );
      });

      if (excelFile) {
        handleFile(excelFile);
        if (files.length > 1) {
          setError(
            `Multiple files detected. Processing: ${excelFile.name}. Please upload one file at a time.`
          );
        }
      } else {
        setError(
          "Please upload a valid Excel file (.xlsx, .xls) or CSV file (.csv)"
        );
      }
    }
  };

  const handleFile = (file: File) => {
    setError("");
    setFile(file);
    setData([]);
    setVoucherData([]);
    setSelectedSheet("");
    setImportResults(null);
    setSendSuccess(false);
    setIsProcessing(true);
    setProcessingStep("Validating file...");

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size too large. Please upload a file smaller than 10MB.");
      setIsProcessing(false);
      return;
    }

    setProcessingStep("Reading file...");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setProcessingStep("Processing Excel data...");
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        // Check if workbook has sheets
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setError("The Excel file appears to be empty or corrupted.");
          setIsProcessing(false);
          return;
        }

        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
        });

        // Check if data is empty
        if (!jsonData || jsonData.length === 0) {
          setError("The Excel sheet appears to be empty.");
          setIsProcessing(false);
          return;
        }

        setProcessingStep("Parsing voucher data...");
        // Set the data for preview
        setData(jsonData as (string | number)[][]);
        setSelectedSheet(sheetName);

        // Parse voucher data dynamically based on headers
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as (string | number)[][];

        // Create a mapping of header names to column indices
        const headerMap: { [key: string]: number } = {};
        headers.forEach((header, index) => {
          if (header) {
            const normalizedHeader = String(header).toLowerCase().trim();
            headerMap[normalizedHeader] = index;
          }
        });

        // Debug: Log the header mapping
        console.log("Excel Headers found:", headers);
        console.log("Header mapping:", headerMap);

        // Store detected headers for UI display
        setDetectedHeaders(headers);

        const parsedVouchers: VoucherData[] = rows
          .filter((row) => {
            // Skip completely empty rows
            return row.some(
              (cell) => cell !== null && cell !== undefined && cell !== ""
            );
          })
          .map((row) => {
            // Helper function to get value by header name
            const getValueByHeader = (headerName: string) => {
              const headerKey = headerName.toLowerCase();
              const columnIndex = headerMap[headerKey];
              return columnIndex !== undefined ? row[columnIndex] : undefined;
            };

            // Helper function to safely get string values
            const getString = (value: unknown) => {
              if (value === null || value === undefined || value === "")
                return "";
              return String(value).trim();
            };

            // Helper function to safely get number values
            const getNumber = (value: unknown) => {
              if (value === null || value === undefined || value === "")
                return 0;
              const num = Number(value);
              return isNaN(num) ? 0 : num;
            };

            // Helper function to get optional string values
            const getOptionalString = (value: unknown) => {
              const str = getString(value);
              return str === "" ? undefined : str;
            };

            // Helper function to safely get date strings
            const getDateString = (value: unknown) => {
              if (!value) return new Date().toISOString().split("T")[0];
              const str = String(value).trim();
              if (str === "") return new Date().toISOString().split("T")[0];

              // Try to parse the date to validate it
              const date = new Date(str);
              if (isNaN(date.getTime())) {
                return new Date().toISOString().split("T")[0];
              }
              return str;
            };

            const voucher: VoucherData = {
              voucherNo: getString(
                getValueByHeader("voucherNo") ||
                  getValueByHeader("voucher no") ||
                  getValueByHeader("voucherno")
              ),
              voucherBook:
                getString(
                  getValueByHeader("voucherBook") ||
                    getValueByHeader("voucher book") ||
                    getValueByHeader("voucherbook")
                ) || "Default Book",
              invoiceNo: getOptionalString(
                getValueByHeader("invoiceNo") ||
                  getValueByHeader("invoice no") ||
                  getValueByHeader("invoiceno")
              ),
              voucherGivenDate: getDateString(
                getValueByHeader("voucherGivenDate") ||
                  getValueByHeader("voucher given date") ||
                  getValueByHeader("vouchergivendate")
              ),
              supplier: getString(
                getValueByHeader("supplier") ||
                  getValueByHeader("supplier name") ||
                  getValueByHeader("suppliername")
              ),
              amount: getNumber(
                getValueByHeader("amount") ||
                  getValueByHeader("total amount") ||
                  getValueByHeader("totalamount")
              ),
              dues: getNumber(
                getValueByHeader("dues") ||
                  getValueByHeader("due amount") ||
                  getValueByHeader("dueamount")
              ),
              return: getNumber(
                getValueByHeader("return") ||
                  getValueByHeader("return amount") ||
                  getValueByHeader("returnamount")
              ),
              discountAdvance: getNumber(
                getValueByHeader("discountAdvance") ||
                  getValueByHeader("discount advance") ||
                  getValueByHeader("discountadvance")
              ),
              amountPaid: getNumber(
                getValueByHeader("amountPaid") ||
                  getValueByHeader("amount paid") ||
                  getValueByHeader("amountpaid")
              ),
              chqCashIssuedDate: getOptionalString(
                getValueByHeader("chqCashIssuedDate") ||
                  getValueByHeader("chq cash issued date") ||
                  getValueByHeader("chqcashissueddate")
              ),
              voucherClearedDate: getOptionalString(
                getValueByHeader("voucherClearedDate") ||
                  getValueByHeader("voucher cleared date") ||
                  getValueByHeader("vouchercleareddate")
              ),
              remarks: getString(
                getValueByHeader("remarks") ||
                  getValueByHeader("comment") ||
                  getValueByHeader("notes")
              ),
            };
            return voucher;
          });

        setVoucherData(parsedVouchers);
        setProcessingStep("File processed successfully!");
        setShowSuccess(true);
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingStep("");
          setShowSuccess(false);
        }, 2000);
      } catch (err) {
        setError("Failed to process Excel file. Please check the file format.");
        console.error("Excel processing error:", err);
        setIsProcessing(false);
        setProcessingStep("");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const sendDataToBackend = async () => {
    if (!branchId) {
      setError("Please enter a Branch ID");
      return;
    }

    if (voucherData.length === 0) {
      setError("No voucher data to send");
      return;
    }

    setIsSending(true);
    setError("");
    setSendSuccess(false);
    setImportResults(null);

    try {
      const response = await fetch("/api/voucherEntry/simple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branchId,
          vouchers: voucherData,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSendSuccess(true);
        setImportResults(result);
        setError("");
      } else {
        setError(result.error || "Failed to import vouchers");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Send data error:", err);
    } finally {
      setIsSending(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      [
        "VoucherNo",
        "VoucherBook",
        "InvoiceNo",
        "VoucherGivenDate",
        "Supplier",
        "Amount",
        "Dues",
        "Return",
        "DiscountAdvance",
        "AmountPaid",
        "ChqCashIssuedDate",
        "VoucherClearedDate",
        "Remarks",
      ],
      [
        "V001",
        "Book1",
        "INV001",
        "2024-01-15",
        "ABC Suppliers",
        "1000",
        "0",
        "0",
        "50",
        "950",
        "2024-01-16",
        "2024-01-17",
        "Sample voucher",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vouchers");
    XLSX.writeFile(wb, "voucher_template.xlsx");
  };

  const formatDataForTable = () => {
    if (data.length === 0) return { headers: [], rows: [] };

    const headers = data[0] as string[];
    const rows = data.slice(1) as (string | number)[][];

    return { headers, rows };
  };

  const { headers, rows } = formatDataForTable();

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 relative"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Global Drag Overlay */}
      {dragActive && (
        <div className="fixed inset-0 bg-indigo-500 bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center bg-white rounded-2xl p-12 shadow-2xl border-4 border-indigo-500">
            <div className="animate-bounce mb-6">
              <Upload className="w-24 h-24 text-indigo-600 mx-auto" />
            </div>
            <h2 className="text-3xl font-bold text-indigo-700 mb-4">
              Drop Excel File Here
            </h2>
            <p className="text-lg text-indigo-600 mb-2">
              Release to upload and process your voucher data
            </p>
            <p className="text-sm text-gray-500">
              Supported: .xlsx, .xls, .csv (max 10MB)
            </p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileSpreadsheet className="w-12 h-12 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-800">
              Voucher Import Tool
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Upload Excel files to import voucher data into the system
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 relative">
          {/* Drag Overlay */}
          {dragActive && (
            <div className="absolute inset-0 bg-indigo-500 bg-opacity-10 rounded-2xl flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-bounce">
                  <Upload className="w-20 h-20 text-indigo-600 mx-auto mb-4" />
                </div>
                <h3 className="text-2xl font-bold text-indigo-700 mb-2">
                  Drop to Upload
                </h3>
                <p className="text-indigo-600">
                  Release the file to start processing
                </p>
              </div>
            </div>
          )}

          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
              dragActive
                ? "border-indigo-500 bg-indigo-50 scale-105 shadow-lg"
                : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div
              className={`transition-all duration-300 ${
                dragActive ? "scale-110" : ""
              }`}
            >
              <Upload
                className={`w-16 h-16 mx-auto mb-4 transition-colors duration-300 ${
                  dragActive ? "text-indigo-500" : "text-gray-400"
                }`}
              />
            </div>
            <h3
              className={`text-xl font-semibold mb-2 transition-colors duration-300 ${
                dragActive ? "text-indigo-700" : "text-gray-700"
              }`}
            >
              {dragActive
                ? "Drop your Excel file now!"
                : "Drop your Excel file here"}
            </h3>
            <p
              className={`mb-4 transition-colors duration-300 ${
                dragActive ? "text-indigo-600" : "text-gray-500"
              }`}
            >
              or click to browse and select a file
            </p>
            <div className="mb-4 text-sm text-gray-400">
              <p>Supported formats: .xlsx, .xls, .csv</p>
              <p>Maximum file size: 10MB</p>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium cursor-pointer transition-all duration-200 inline-flex items-center gap-2 hover:scale-105 hover:shadow-lg"
            >
              <Upload className="w-5 h-5" />
              Choose File
            </label>
            <div className="mt-4">
              <button
                onClick={downloadTemplate}
                className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-2 mx-auto transition-colors duration-200 hover:scale-105"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>
          </div>

          {file && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">{file.name}</p>
                    <p className="text-sm text-green-600">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setData([]);
                    setVoucherData([]);
                    setSelectedSheet("");
                    setError("");
                    setImportResults(null);
                    setSendSuccess(false);
                    setIsProcessing(false);
                    setProcessingStep("");
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                {showSuccess ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 animate-pulse" />
                ) : (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                )}
                <div>
                  <p className="font-medium text-blue-800">
                    {showSuccess
                      ? "File processed successfully!"
                      : "Processing file..."}
                  </p>
                  <p className="text-sm text-blue-600">{processingStep}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {sendSuccess && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <p className="text-green-700">
                  Successfully imported {importResults?.createdCount || 0}{" "}
                  vouchers!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Branch ID Input */}
        {voucherData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Branch ID Configuration
            </h3>
            {branchId ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={branchId}
                    readOnly
                    className="flex-1 px-4 py-3 border-2 border-green-200 bg-green-50 rounded-lg focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200"
                  />
                  <button
                    onClick={loadBranchId}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>
                <p className="text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Branch ID loaded from your current session
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  placeholder="Enter Branch ID (e.g., 507f1f77bcf86cd799439011)"
                  className="w-full px-4 py-3 border-2 border-orange-200 bg-orange-50 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200"
                />
                <p className="text-sm text-orange-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  No branch ID found in session. Please navigate to a branch
                  first or enter manually.
                </p>
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={sendDataToBackend}
                disabled={isSending || !branchId}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending Data...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Send Data to Backend
                  </>
                )}
              </button>

              {sendSuccess && importResults && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">
                    Import Results:
                  </h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>
                      • Created: {importResults.createdCount || 0} vouchers
                    </li>
                    <li>
                      • Skipped: {importResults.skippedCount || 0} vouchers
                    </li>
                    <li>• Errors: {importResults.errorCount || 0} vouchers</li>
                  </ul>
                  <button
                    onClick={() =>
                      router.push(`/admin/dashboard/branch/${branchId}/details`)
                    }
                    className="mt-3 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Imported Vouchers
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Preview */}
        {data.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">
                Data Preview {selectedSheet && `- ${selectedSheet}`}
              </h3>
            </div>

            {/* Detected Headers */}
            {detectedHeaders.length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">
                  Detected Headers:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {detectedHeaders.map((header, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                    >
                      {header || `Column ${index + 1}`}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  The system will automatically map these headers to voucher
                  fields
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button className="px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 bg-white text-indigo-600 shadow-sm">
                  <Eye className="w-4 h-4" />
                  Table
                </button>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <div className="min-w-full">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      {headers.map((header, index) => (
                        <th
                          key={index}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                        >
                          {header || `Column ${index + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rows.slice(0, 10).map((row, _rowIndex) => (
                      <tr key={_rowIndex} className="hover:bg-gray-50">
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-4 py-3 text-sm text-gray-900 border-b"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p>
                Total rows: {data.length} | Total columns: {headers.length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelUploaderUI;
