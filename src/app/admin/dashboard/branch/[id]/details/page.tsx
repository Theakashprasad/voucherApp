"use client";

import React, { useEffect, useState } from "react";

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  Edit,
  Filter,
  Search,
  Calendar,
  Users,
  Receipt,
  DollarSign,
  FileSpreadsheet,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import * as XLSX from "xlsx";

export type Voucher = {
  _id: string;
  voucherNo: string;
  voucherBook: string;
  invoiceNo?: string;
  createdAt?: string;
  voucherGivenDate: string;
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
  remarks: string;
  status: "pending" | "active" | "cancel";
};

function PageImpl({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [branchName] = useState<string>("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    status: false,
  });
  const [columnVisibilityLoaded, setColumnVisibilityLoaded] = useState(false);
  const [data, setData] = useState<Voucher[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const { id: branchId } = React.use(params);

  // Save column visibility to database
  const saveColumnVisibility = async (newVisibility: VisibilityState) => {
    const raw = localStorage.getItem("branchDetails");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const branchIdFromStorage =
      typeof parsed?._id === "string" ? parsed._id : null;

    if (!branchIdFromStorage) return;

    try {
      await fetch("/api/branch/columns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: branchIdFromStorage,
          columnVisibility: newVisibility,
        }),
      });
    } catch (error) {
      console.error("Error saving column visibility:", error);
    }
  };

  const toLocalYmd = (isoLike?: string) => {
    if (!isoLike) return "";
    const d = new Date(isoLike);
    if (Number.isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Date range filter helpers
  type DateRange = { from?: string; to?: string };
  const normalizeDate = (value?: string) =>
    value ? String(value).slice(0, 10) : undefined;
  const isWithinDateRange = (cellValue: unknown, range: DateRange) => {
    const value = normalizeDate(
      typeof cellValue === "string" ? cellValue : undefined
    );
    if (!value) return false;
    const fromOk = range.from ? value >= range.from : true;
    const toOk = range.to ? value <= range.to : true;
    return fromOk && toOk;
  };

  // Local UI state for three date filters
  const [issueDateRange, setIssueDateRange] = useState<DateRange>({}); // column: date
  const [givenDateRange, setGivenDateRange] = useState<DateRange>({}); // column: voucherGivenDate
  const [clearedDateRange, setClearedDateRange] = useState<DateRange>({}); // column: voucherClearedDate

  // Load column visibility preferences
  useEffect(() => {
    const loadColumnVisibility = async () => {
      const raw = localStorage.getItem("branchDetails");
      if (!raw) {
        setColumnVisibilityLoaded(true);
        return;
      }
      const parsed = JSON.parse(raw);
      const branchIdFromStorage =
        typeof parsed?._id === "string" ? parsed._id : null;

      if (!branchIdFromStorage) {
        setColumnVisibilityLoaded(true);
        return;
      }

      try {
        const res = await fetch(
          `/api/branch/columns?branchId=${branchIdFromStorage}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.columnVisibility) {
            const normalized: VisibilityState = Object.fromEntries(
              Object.entries(
                data.columnVisibility as Record<string, unknown>
              ).map(([k, v]) => [k, Boolean(v)])
            );
            normalized.status = false;
            setColumnVisibility(normalized);
          } else {
            setColumnVisibility({ status: false });
          }
        }
      } catch (error) {
        console.error("Error loading column visibility:", error);
      } finally {
        setColumnVisibilityLoaded(true);
      }
    };

    loadColumnVisibility();
  }, []);

  useEffect(() => {
    const fetchVouchers = async () => {
      if (!branchId) return;
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("page", String(pageIndex + 1));
        params.set("pageSize", String(pageSize));

        if (sorting?.[0]) {
          params.set("sortBy", sorting[0].id);
          params.set("sortDir", sorting[0].desc ? "desc" : "asc");
        }

        const addDateParams = (
          keyPrefix: string,
          range: { from?: string; to?: string }
        ) => {
          if (range.from) params.set(`${keyPrefix}From`, range.from);
          if (range.to) params.set(`${keyPrefix}To`, range.to);
        };
        addDateParams("created", issueDateRange);
        addDateParams("given", givenDateRange);
        addDateParams("cleared", clearedDateRange);

        const voucherNoFilter = (
          table.getColumn("voucherNo")?.getFilterValue() as string
        )?.trim();
        if (voucherNoFilter) params.set("voucherNo", voucherNoFilter);

        const supplierFilter = (
          table.getColumn("supplier")?.getFilterValue() as string
        )?.trim();
        if (supplierFilter) params.set("supplier", supplierFilter);

        const statusFilter = table.getColumn("status")?.getFilterValue() as
          | string
          | undefined;
        if (statusFilter) params.set("status", statusFilter);

        const res = await fetch(
          `/api/voucherEntry/${branchId}?${params.toString()}`
        );
        if (!res.ok) return;
        const response = await res.json();

        const vouchers = Array.isArray(response)
          ? response
          : response.vouchers || [];

        const mapped: Voucher[] = vouchers.map(
          (v: Record<string, unknown>) => ({
            _id: String(v._id),
            voucherNo: String(v.voucherNo ?? ""),
            voucherBook: String(v.voucherBook ?? ""),
            invoiceNo: v.invoiceNo ? String(v.invoiceNo) : undefined,
            createdAt: v.createdAt
              ? String(v.createdAt).slice(0, 10)
              : undefined,
            voucherGivenDate: v.voucherGivenDate
              ? String(v.voucherGivenDate).slice(0, 10)
              : "",
            supplier: String(v.supplier ?? ""),
            amount: Number(v.amount ?? 0),
            dues: Number(v.dues ?? 0),
            return: Number(v.return ?? 0),
            discountAdvance: Number(v.discountAdvance ?? 0),
            netBalance: Number(v.netBalance ?? 0),
            modeOfPayment: String(v.modeOfPayment ?? ""),
            chqCashIssuedDate: v.chqCashIssuedDate
              ? String(v.chqCashIssuedDate).slice(0, 10)
              : "",
            amountPaid: Number(v.amountPaid ?? 0),
            voucherClearedDate: v.voucherClearedDate
              ? String(v.voucherClearedDate).slice(0, 10)
              : "",
            remarks: String(v.remarks ?? ""),
            status: (String(v.status ?? "") === "cancel"
              ? "cancel"
              : v.voucherClearedDate
              ? "active"
              : "pending") as "pending" | "active" | "cancel",
          })
        );
        setData(mapped);

        if (!Array.isArray(response)) {
          setTotalCount(Number(response.totalCount || 0));
        } else {
          const count = mapped.length;
          setTotalCount(count);
        }
      } catch (err) {
        console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVouchers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    branchId,
    pageIndex,
    pageSize,
    sorting,
    columnFilters,
    issueDateRange,
    givenDateRange,
    clearedDateRange,
  ]);

  const columns: ColumnDef<Voucher>[] = [
    {
      id: "paid",
      header: () => <div className="text-sm">Paid</div>,
      cell: ({ row }) => {
        const isPaid = Boolean(row.original.voucherClearedDate);

        return (
          <div className="flex items-center justify-center">
            <div
              className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                isPaid
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-300"
              }`}
            >
              {isPaid && (
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "voucherNo",
      header: "Voucher No",
      cell: ({ row }) => (
        <div className="font-mono font-medium text-blue-600 text-sm">
          {row.getValue("voucherNo")}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "voucherBook",
      header: "Voucher Book",
      cell: ({ row }) => (
        <div className="font-medium text-sm">{row.getValue("voucherBook")}</div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "invoiceNo",
      header: "Invoice No",
      cell: ({ row }) => (
        <div className="font-medium text-sm">
          {row.getValue("invoiceNo") || "-"}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "createdAt",
      filterFn: (row, id, value: DateRange) => {
        if (!value || (!value.from && !value.to)) return true;
        return isWithinDateRange(row.getValue(id), value);
      },
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="uppercase"
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const raw = row.getValue("createdAt") as string | undefined;
        const display = raw ? toLocalYmd(String(raw)) || "-" : "-";
        return <div className="text-sm">{display}</div>;
      },
    },
    {
      accessorKey: "voucherGivenDate",
      filterFn: (row, id, value: DateRange) => {
        if (!value || (!value.from && !value.to)) return true;
        return isWithinDateRange(row.getValue(id), value);
      },
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="uppercase"
          >
            Given Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const raw = row.getValue("voucherGivenDate") as string | undefined;
        const display = raw ? toLocalYmd(String(raw)) || "-" : "-";
        return <div className="text-sm">{display}</div>;
      },
    },
    {
      accessorKey: "voucherClearedDate",
      filterFn: (row, id, value: DateRange) => {
        if (!value || (!value.from && !value.to)) return true;
        return isWithinDateRange(row.getValue(id), value);
      },
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="uppercase"
          >
            Cleared Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const raw = row.getValue("voucherClearedDate") as string | undefined;
        const display = raw ? toLocalYmd(String(raw)) || "-" : "-";
        return <div className="text-sm">{display}</div>;
      },
    },

    {
      accessorKey: "supplier",
      header: "Supplier",
      cell: ({ row }) => (
        <div className="font-medium text-sm">{row.getValue("supplier")}</div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "amount",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="ml-auto"
          >
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("amount"));
        const formatted = new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(amount);
        return (
          <div className="text-right font-medium text-sm">{formatted}</div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      filterFn: (row, id, value: string | undefined) => {
        if (!value) return true;
        return (row.getValue(id) as string) === value;
      },
      cell: ({ row }) => {
        const value = row.getValue("status") as "pending" | "active" | "cancel";
        if (value === "cancel") {
          return (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
              Cancelled
            </span>
          );
        }
        const isPaid = value === "active";
        return (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
              isPaid
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {isPaid ? "Paid" : "Unpaid"}
          </span>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "dues",
      header: () => <div className="text-right">Dues</div>,
      cell: ({ row }) => {
        const dues = parseFloat(row.getValue("dues"));
        const formatted = new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(dues);
        return <div className="text-right text-sm">{formatted}</div>;
      },
      enableSorting: false,
    },
    {
      accessorKey: "return",
      header: () => <div className="text-right">Return</div>,
      cell: ({ row }) => {
        const returnAmount = parseFloat(row.getValue("return"));
        const formatted = new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(returnAmount);
        return <div className="text-right text-sm">{formatted}</div>;
      },
      enableSorting: false,
    },
    {
      accessorKey: "discountAdvance",
      header: () => <div className="text-right">Advance</div>,
      cell: ({ row }) => {
        const discountAdvance = parseFloat(row.getValue("discountAdvance"));
        const formatted = new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(discountAdvance);
        return <div className="text-right text-sm">{formatted}</div>;
      },
      enableSorting: false,
    },
    {
      accessorKey: "netBalance",
      header: () => <div className="text-right">Net Balance</div>,
      cell: ({ row }) => {
        const netBalance = parseFloat(row.getValue("netBalance"));
        const formatted = new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(netBalance);
        return (
          <div className="text-right font-medium text-sm">{formatted}</div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "chqCashIssuedDate",
      header: "CHQ/Cash Date",
      cell: ({ row }) => {
        const raw = row.getValue("chqCashIssuedDate") as string | undefined;
        const display = raw ? toLocalYmd(String(raw)) || "-" : "-";
        return <div className="text-sm">{display}</div>;
      },
      enableSorting: false,
    },
    {
      accessorKey: "amountPaid",
      header: () => <div className="text-right">Amount Paid</div>,
      cell: ({ row }) => {
        const amountPaid = parseFloat(row.getValue("amountPaid"));
        const formatted = new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(amountPaid);
        return <div className="text-right text-sm">{formatted}</div>;
      },
      enableSorting: false,
    },

    {
      accessorKey: "remarks",
      header: "Remarks",
      cell: ({ row }) => (
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="max-w-xs truncate cursor-pointer hover:text-blue-600 text-sm">
              {row.getValue("remarks")}
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto max-w-lg p-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">Remarks</h4>
              <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-normal">
                {row.getValue("remarks")}
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>
      ),
      enableSorting: false,
    },
    {
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => {
        const voucher = row.original;

        const handleDelete = async () => {
          try {
            const res = await fetch(`/api/voucherEntry/${voucher._id}`, {
              method: "DELETE",
            });

            if (!res.ok) {
              const error = await res.json().catch(() => ({}));
              toast.error(error?.error || "Failed to delete voucher");
              return;
            }

            // Remove from local state
            setData((prev) => prev.filter((v) => v._id !== voucher._id));
            toast.success("Voucher deleted successfully");
          } catch (error) {
            console.error("Error deleting voucher:", error);
            toast.error("Error deleting voucher");
          }
        };

        return (
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                localStorage.setItem(
                  "branchDetails",
                  JSON.stringify({ _id: branchId })
                );
                router.push(`/branch/editVoucherEntry/${voucher._id}`);
              }}
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit voucher</span>
            </Button>
            <ConfirmDialog
              triggerLabel={
                <div className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent h-8 w-8 p-0 text-red-600 hover:text-red-700 rounded-md">
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete voucher</span>
                </div>
              }
              title="Delete Voucher"
              description={`Are you sure you want to delete voucher #${voucher.voucherNo}? This action cannot be undone.`}
              confirmLabel="Delete"
              cancelLabel="Cancel"
              onConfirm={handleDelete}
            />
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: (updater) => {
      const newVisibility =
        typeof updater === "function" ? updater(columnVisibility) : updater;
      // Force status to remain hidden
      (newVisibility as VisibilityState).status = false;
      setColumnVisibility(newVisibility);
      saveColumnVisibility(newVisibility);
    },
    manualPagination: true,
    autoResetPageIndex: false,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination: { pageIndex, pageSize },
    },
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const next = updater({ pageIndex, pageSize });
        setPageIndex(next.pageIndex);
        setPageSize(next.pageSize);
      } else {
        setPageIndex(updater.pageIndex);
        setPageSize(updater.pageSize);
      }
    },
  });

  // Calculate totals for filtered data (for display purposes)
  const filteredData = table
    .getFilteredRowModel()
    .rows.map((row) => row.original);
  const filteredGrandTotalAmount = filteredData.reduce(
    (sum, voucher) => sum + (voucher.netBalance || 0),
    0
  );

  const formatDate = (d?: string) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const createExcelFile = (rows: Voucher[]) => {
    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Prepare the data with proper formatting
    const excelData: (string | number)[][] = [];

    // Add headers with proper spacing
    const headers = [
      "STATUS",
      "VOUCHER NO",
      "VOUCHER BOOK",
      "INVOICE NO",
      "CREATED DATE",
      "VOUCHER DATE",
      "VOUCHER CLEARED",
      "SUPPLIER",
      "AMOUNT",
      "DUES",
      "RETURN",
      "DISCOUNT",
      "NET BALANCE",
      "CHQ/CASH ISSUED DATE",
      "AMT PAID",
      "REMARKS",
    ];
    excelData.push(headers);

    // Add data rows
    rows.forEach((v) => {
      excelData.push([
        v.status === "active" ? "Paid" : "Unpaid",
        v.voucherNo,
        v.voucherBook || "",
        v.invoiceNo || "",
        formatDate(v.createdAt),
        formatDate(v.voucherGivenDate),
        formatDate(v.voucherClearedDate),
        v.supplier,
        v.amount,
        v.dues,
        v.return,
        v.discountAdvance,
        v.netBalance,
        formatDate(v.chqCashIssuedDate),
        v.amountPaid,
        v.remarks || "",
      ]);
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Set column widths for better formatting
    const colWidths = [
      { wch: 10 }, // STATUS
      { wch: 12 }, // VOUCHER NO
      { wch: 15 }, // VOUCHER BOOK
      { wch: 12 }, // INVOICE NO
      { wch: 15 }, // CREATED DATE
      { wch: 15 }, // VOUCHER DATE
      { wch: 20 }, // VOUCHER CLEARED DATE
      { wch: 15 }, // SUPPLIER
      { wch: 12 }, // AMOUNT
      { wch: 12 }, // DUES
      { wch: 12 }, // RETURN
      { wch: 18 }, // DISCOUNT/ADVANCE
      { wch: 15 }, // NET BALANCE
      { wch: 20 }, // CHQ/CASH ISSUED DATE
      { wch: 12 }, // AMT PAID
      { wch: 30 }, // REMARKS
    ];
    ws["!cols"] = colWidths;

    // Style the header row (row 0, 0-indexed)
    const headerRowIndex = 0;
    headers.forEach((_, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({
        r: headerRowIndex,
        c: colIndex,
      });
      if (!ws[cellRef]) ws[cellRef] = { v: headers[colIndex] };
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F81BD" } }, // Blue background
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      };
    });

    // Add the worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Vouchers");

    return wb;
  };

  const handleExportExcel = () => {
    const filteredRows = table
      .getFilteredRowModel()
      .rows.map((r) => r.original);
    const useFiltered =
      filteredRows.length > 0 && filteredRows.length < data.length;
    const rows = useFiltered ? filteredRows : data;

    const wb = createExcelFile(rows);

    const suffix = useFiltered ? "filtered" : "all";
    const today = new Date().toISOString().slice(0, 10);
    const safeBranch = (branchName || "branch").replace(/[^a-z0-9-_]+/gi, "-");
    const filename = `vouchers_${safeBranch}_${today}_${suffix}.xlsx`;

    XLSX.writeFile(wb, filename);
    toast.success(`Excel file exported successfully: ${filename}`);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Header Section */}
        <div className="bg-transparent backdrop-blur-sm ">
          <div className=" mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"></h1>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-white hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-gray-100 text-sm"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Excel
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full px-6 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Total Vouchers
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {totalCount}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Receipt className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Total Amount
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{filteredGrandTotalAmount.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg mb-6">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Filter className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Filters & Search
                </h3>
              </div>

              {/* Search Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Voucher Number
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={
                        (table
                          .getColumn("voucherNo")
                          ?.getFilterValue() as string) ?? ""
                      }
                      onChange={(event) => {
                        table
                          .getColumn("voucherNo")
                          ?.setFilterValue(event.target.value);
                        setPageIndex(0);
                      }}
                      placeholder="Enter voucher number..."
                      className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Supplier
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={
                        (table
                          .getColumn("supplier")
                          ?.getFilterValue() as string) ?? ""
                      }
                      onChange={(event) => {
                        table
                          .getColumn("supplier")
                          ?.setFilterValue(event.target.value);
                        setPageIndex(0);
                      }}
                      placeholder="Enter supplier name..."
                      className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Status
                  </label>
                  <select
                    value={
                      (table.getColumn("status")?.getFilterValue() as string) ??
                      ""
                    }
                    onChange={(e) => {
                      table
                        .getColumn("status")
                        ?.setFilterValue(e.target.value || undefined);
                      setPageIndex(0);
                    }}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200"
                  >
                    <option value="">All Status</option>
                    <option value="active">Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              {/* Date Filters */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    Created Date Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={issueDateRange.from ?? ""}
                      onChange={(e) => {
                        const next = {
                          ...issueDateRange,
                          from: e.target.value || undefined,
                        };
                        setIssueDateRange(next);
                        table.getColumn("createdAt")?.setFilterValue(next);
                        setPageIndex(0);
                      }}
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200"
                    />
                    <input
                      type="date"
                      value={issueDateRange.to ?? ""}
                      onChange={(e) => {
                        const next = {
                          ...issueDateRange,
                          to: e.target.value || undefined,
                        };
                        setIssueDateRange(next);
                        table.getColumn("createdAt")?.setFilterValue(next);
                        setPageIndex(0);
                      }}
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-500" />
                    Given Date Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={givenDateRange.from ?? ""}
                      onChange={(e) => {
                        const next = {
                          ...givenDateRange,
                          from: e.target.value || undefined,
                        };
                        setGivenDateRange(next);
                        table
                          .getColumn("voucherGivenDate")
                          ?.setFilterValue(next);
                        setPageIndex(0);
                      }}
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200"
                    />
                    <input
                      type="date"
                      value={givenDateRange.to ?? ""}
                      onChange={(e) => {
                        const next = {
                          ...givenDateRange,
                          to: e.target.value || undefined,
                        };
                        setGivenDateRange(next);
                        table
                          .getColumn("voucherGivenDate")
                          ?.setFilterValue(next);
                        setPageIndex(0);
                      }}
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                    Cleared Date Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={clearedDateRange.from ?? ""}
                      onChange={(e) => {
                        const next = {
                          ...clearedDateRange,
                          from: e.target.value || undefined,
                        };
                        setClearedDateRange(next);
                        table
                          .getColumn("voucherClearedDate")
                          ?.setFilterValue(next);
                        setPageIndex(0);
                      }}
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200"
                    />
                    <input
                      type="date"
                      value={clearedDateRange.to ?? ""}
                      onChange={(e) => {
                        const next = {
                          ...clearedDateRange,
                          to: e.target.value || undefined,
                        };
                        setClearedDateRange(next);
                        table
                          .getColumn("voucherClearedDate")
                          ?.setFilterValue(next);
                        setPageIndex(0);
                      }}
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={() => {
                    setLoading(true);
                    setIssueDateRange({});
                    setGivenDateRange({});
                    setClearedDateRange({});
                    table.getColumn("createdAt")?.setFilterValue(undefined);
                    table
                      .getColumn("voucherGivenDate")
                      ?.setFilterValue(undefined);
                    table
                      .getColumn("voucherClearedDate")
                      ?.setFilterValue(undefined);
                    table.getColumn("voucherNo")?.setFilterValue("");
                    table.getColumn("supplier")?.setFilterValue("");
                    table.getColumn("status")?.setFilterValue(undefined);
                    setPageIndex(0);
                  }}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:ring-4 focus:ring-gray-100 transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Reset All Filters
                    </>
                  )}
                </button>

                {/* <div className="relative">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 focus:ring-4 focus:ring-blue-100 transition-all duration-200">
                        <Eye className="h-4 w-4" />
                        Columns
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      {table
                        .getAllColumns()
                        .filter((column) => column.getCanHide())
                        .map((column) => {
                          return (
                            <DropdownMenuCheckboxItem
                              key={column.id}
                              className="capitalize text-sm"
                              checked={column.getIsVisible()}
                              onCheckedChange={(value) =>
                                column.toggleVisibility(!!value)
                              }
                            >
                              {column.id}
                            </DropdownMenuCheckboxItem>
                          );
                        })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div> */}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg overflow-hidden">
            <div className="overflow-x-auto relative">
              {(loading || !columnVisibilityLoaded) && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-20">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg
                      className="animate-spin h-4 w-4 text-gray-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    {loading ? "Loading vouchers..." : "Loading preferences..."}
                  </div>
                </div>
              )}
              <div className="min-w-full">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                          return (
                            <TableHead
                              key={header.id}
                              className="text-sm font-semibold text-gray-700 p-4 border-b border-gray-200 uppercase"
                            >
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          className={`hover:bg-gray-50 transition-colors duration-200 ${
                            row.original.status === "active"
                              ? "bg-green-100"
                              : ""
                          } ${
                            row.original.status === "cancel"
                              ? "line-through opacity-70"
                              : ""
                          }`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className="text-sm p-4 border-b border-gray-100"
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-32 text-center text-gray-500"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Receipt className="h-8 w-8 text-gray-300" />
                            {loading
                              ? "Loading vouchers..."
                              : "No results. Adjust filters to see more."}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Showing{" "}
                  <span className="font-semibold text-gray-900">
                    {pageIndex * pageSize + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-gray-900">
                    {Math.min((pageIndex + 1) * pageSize, totalCount)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-900">
                    {totalCount}
                  </span>{" "}
                  results
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Rows per page:</span>
                  <select
                    value={table.getState().pagination.pageSize}
                    onChange={(e) => {
                      table.setPageSize(Number(e.target.value));
                    }}
                    className="px-3 py-1 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                  >
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <option key={pageSize} value={pageSize}>
                        {pageSize}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPageIndex(0)}
                  disabled={pageIndex === 0}
                  className="p-2 rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  disabled={pageIndex === 0}
                  className="p-2 rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-1">
                  {(() => {
                    const pageCount = Math.max(
                      1,
                      Math.ceil(totalCount / pageSize)
                    );
                    const currentPage = pageIndex;
                    const pages = [];

                    // Show first page
                    if (pageCount > 0) {
                      pages.push(
                        <button
                          key={0}
                          onClick={() => setPageIndex(0)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                            currentPage === 0
                              ? "bg-blue-600 text-white shadow-lg"
                              : "border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          1
                        </button>
                      );
                    }

                    // Show ellipsis if needed
                    if (currentPage > 3) {
                      pages.push(
                        <span key="ellipsis1" className="px-2 text-gray-400">
                          ...
                        </span>
                      );
                    }

                    // Show pages around current page
                    for (
                      let i = Math.max(1, currentPage - 1);
                      i <= Math.min(pageCount - 2, currentPage + 1);
                      i++
                    ) {
                      if (i > 0 && i < pageCount - 1) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setPageIndex(i)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                              currentPage === i
                                ? "bg-blue-600 text-white shadow-lg"
                                : "border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {i + 1}
                          </button>
                        );
                      }
                    }

                    // Show ellipsis if needed
                    if (currentPage < pageCount - 4) {
                      pages.push(
                        <span key="ellipsis2" className="px-2 text-gray-400">
                          ...
                        </span>
                      );
                    }

                    // Show last page
                    if (pageCount > 1) {
                      pages.push(
                        <button
                          key={pageCount - 1}
                          onClick={() => setPageIndex(pageCount - 1)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                            currentPage === pageCount - 1
                              ? "bg-blue-600 text-white shadow-lg"
                              : "border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {pageCount}
                        </button>
                      );
                    }

                    return pages;
                  })()}
                </div>

                <button
                  onClick={() => setPageIndex((p) => p + 1)}
                  disabled={
                    pageIndex + 1 >=
                    Math.max(1, Math.ceil(totalCount / pageSize))
                  }
                  className="p-2 rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() =>
                    setPageIndex(
                      Math.max(0, Math.ceil(totalCount / pageSize) - 1)
                    )
                  }
                  disabled={
                    pageIndex + 1 >=
                    Math.max(1, Math.ceil(totalCount / pageSize))
                  }
                  className="p-2 rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <PageImpl {...props} />;
}
