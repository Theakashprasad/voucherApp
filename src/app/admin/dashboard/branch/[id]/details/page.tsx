"use client";

import React, { useEffect, useState } from "react";

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

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
  status: "pending" | "active";
};

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [branchName] = useState<string>("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    status: false,
  });
  const [data, setData] = useState<Voucher[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [grandTotalAmount, setGrandTotalAmount] = useState(0);

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

  const { id: branchId } = React.use(params);

  // Fetch vouchers for this branch with pagination and filters
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
            status: (v.voucherClearedDate ? "active" : "pending") as
              | "pending"
              | "active",
          })
        );
        setData(mapped);

        if (!Array.isArray(response)) {
          setTotalCount(Number(response.totalCount || 0));
          setGrandTotalAmount(Number(response.grandTotalAmount || 0));
        } else {
          const count = mapped.length;
          setTotalCount(count);
          setGrandTotalAmount(mapped.reduce((s, v) => s + (v.amount || 0), 0));
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
    issueDateRange,
    givenDateRange,
    clearedDateRange,
  ]);

  const columns: ColumnDef<Voucher>[] = [
    {
      id: "paid",
      header: () => <div className="text-xs">Paid</div>,
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
        <div className="font-mono font-medium text-blue-600">
          {row.getValue("voucherNo")}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "voucherBook",
      header: "Voucher Book",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("voucherBook")}</div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "invoiceNo",
      header: "Invoice No",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("invoiceNo") || "-"}</div>
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
        const display = raw ? String(raw).slice(0, 10) : "-";
        return <div>{display}</div>;
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
            Voucher Given Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const raw = row.getValue("voucherGivenDate") as string | undefined;
        const display = raw ? String(raw).slice(0, 10) : "-";
        return <div>{display}</div>;
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
            Voucher Cleared Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const raw = row.getValue("voucherClearedDate") as string | undefined;
        const display = raw ? String(raw).slice(0, 10) : "-";
        return <div>{display}</div>;
      },
    },
    {
      accessorKey: "supplier",
      header: "Supplier",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("supplier")}</div>
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
        return <div className="text-right font-medium">{formatted}</div>;
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
        const value = row.getValue("status") as "pending" | "active";
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
        return <div className="text-right">{formatted}</div>;
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
        return <div className="text-right">{formatted}</div>;
      },
      enableSorting: false,
    },
    {
      accessorKey: "discountAdvance",
      header: () => <div className="text-right">Discount/Advance</div>,
      cell: ({ row }) => {
        const discountAdvance = parseFloat(row.getValue("discountAdvance"));
        const formatted = new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(discountAdvance);
        return <div className="text-right">{formatted}</div>;
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
        return <div className="text-right font-medium">{formatted}</div>;
      },
      enableSorting: false,
    },
    {
      accessorKey: "chqCashIssuedDate",
      header: "CHQ/Cash Issued Date",
      cell: ({ row }) => {
        const raw = row.getValue("chqCashIssuedDate") as string | undefined;
        const display = raw ? String(raw).slice(0, 10) : "-";
        return <div>{display}</div>;
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
        return <div className="text-right">{formatted}</div>;
      },
      enableSorting: false,
    },

    {
      accessorKey: "remarks",
      header: "Remarks",
      cell: ({ row }) => (
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="max-w-xs truncate cursor-pointer hover:text-blue-600">
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
                <div className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0 text-red-600 hover:text-red-700 rounded-md">
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
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
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

  // Use server-calculated or derived grand total
  const filteredGrandTotalAmount = grandTotalAmount;

  const escapeForCsv = (value: unknown) => {
    const asString = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(asString)) {
      return '"' + asString.replace(/"/g, '""') + '"';
    }
    return asString;
  };

  const vouchersToCsv = (rows: Voucher[]) => {
    const headers = [
      "Voucher No",
      "Invoice No",
      "Date",
      "Voucher Given Date",
      "Supplier",
      "Status",
      "Amount",
      "Dues",
      "Return",
      "Discount/Advance",
      "Net Balance",
      "CHQ/Cash Issued Date",
      "Amount Paid",
      "Voucher Cleared Date",
      "Remarks",
    ];

    // Wrap dates so Excel treats them as text and avoids ####### when columns are narrow
    const formatDate = (d?: string) => {
      const s = d ? String(d).slice(0, 10) : "";
      return s ? `="${s}"` : "";
    };

    const lines = rows.map((v) => [
      v.voucherNo,
      v.invoiceNo || "",
      formatDate(v.createdAt),
      formatDate(v.voucherGivenDate),
      v.supplier,
      v.status === "active" ? "Paid" : "Unpaid",
      v.amount,
      v.dues,
      v.return,
      v.discountAdvance,
      v.netBalance,
      formatDate(v.chqCashIssuedDate),
      v.amountPaid,
      formatDate(v.voucherClearedDate),
      v.remarks,
    ]);

    const csv = [headers, ...lines]
      .map((row) => row.map(escapeForCsv).join(","))
      .join("\n");

    return csv;
  };

  const downloadCsv = (csv: string, filename: string) => {
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const filteredRows = table
      .getFilteredRowModel()
      .rows.map((r) => r.original);
    const useFiltered =
      filteredRows.length > 0 && filteredRows.length < data.length;
    const rows = useFiltered ? filteredRows : data;
    const csv = vouchersToCsv(rows);
    const suffix = useFiltered ? "filtered" : "all";
    const today = new Date().toISOString().slice(0, 10);
    const safeBranch = (branchName || "branch").replace(/[^a-z0-9-_]+/gi, "-");
    downloadCsv(csv, `vouchers_${safeBranch}_${today}_${suffix}.csv`);
  };

  return (
    <>
      <div className="w-full min-h-screen bg-gray-50 p-4">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 mt-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Voucher Dashboard
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Track and manage vouchers by status and dates
              </p>
            </div>
            <div className="pr-10">
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={handleExportCsv}
              >
                Export (CSV)
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-gray-500">Total Vouchers</div>
                <div className="text-xl font-semibold text-gray-900">
                  {totalCount}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-gray-500">Grand Total Amount</div>
                <div className="text-lg font-bold text-blue-700">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                  }).format(filteredGrandTotalAmount)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="mt-4 rounded-md border bg-white">
            <div className="p-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="whitespace-nowrap">Date:</span>
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
                      className="px-2 py-1 border border-gray-300 rounded"
                    />
                    <span>to</span>
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
                      className="px-2 py-1 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="whitespace-nowrap">Voucher Given:</span>
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
                      className="px-2 py-1 border border-gray-300 rounded"
                    />
                    <span>to</span>
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
                      className="px-2 py-1 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="whitespace-nowrap">Cleared:</span>
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
                      className="px-2 py-1 border border-gray-300 rounded"
                    />
                    <span>to</span>
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
                      className="px-2 py-1 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="whitespace-nowrap">Paid:</span>
                    <select
                      value={
                        (table
                          .getColumn("status")
                          ?.getFilterValue() as string) ?? ""
                      }
                      onChange={(e) => {
                        table
                          .getColumn("status")
                          ?.setFilterValue(e.target.value || undefined);
                        setPageIndex(0);
                      }}
                      className="px-2 py-1 border border-gray-300 rounded text-xs"
                    >
                      <option value="">All</option>
                      <option value="active">Paid</option>
                      <option value="pending">Unpaid</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
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
                        table.getColumn("status")?.setFilterValue(undefined);
                        setPageIndex(0);
                      }}
                    >
                      Reset Filters
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 rounded-md border bg-white">
          <div className="p-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex gap-2 w-full">
                <Input
                  placeholder="Search by voucher number..."
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
                  className="max-w-md text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Columns control outside the filters box */}
        <div className="flex justify-end items-center mb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                Columns <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize text-xs"
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
        </div>

        {/* Voucher Table */}
        <div className="overflow-x-auto rounded-md border bg-white">
          <div className="min-w-full">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead
                          key={header.id}
                          className="text-sm uppercase p-3 "
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
                      className={
                        row.original.status === "active" ? "bg-green-50" : ""
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="text-sm p-3">
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
                      className="h-24 text-center text-sm text-gray-500"
                    >
                      {loading
                        ? "Loading vouchers..."
                        : "No results. Adjust filters to see more."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination and Row Selection */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3">
          <div className="text-muted-foreground text-xs">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>

          {/* Page Size Selection */}
          <div className="flex items-center gap-2 text-xs">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPageIndex(0);
              }}
              className="px-2 py-1 border border-gray-300 rounded text-xs"
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <span>Page</span>
              <strong>
                {pageIndex + 1} of{" "}
                {Math.max(1, Math.ceil(totalCount / pageSize))}
              </strong>
            </div>

            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="text-xs px-2 py-1 h-8"
              >
                {"<<"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="text-xs px-3 py-1 h-8"
              >
                Previous
              </Button>

              {/* Page Numbers */}
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
                      <Button
                        key={0}
                        variant={currentPage === 0 ? "default" : "outline"}
                        size="sm"
                        onClick={() => table.setPageIndex(0)}
                        className="text-xs px-2 py-1 h-8 w-8"
                      >
                        1
                      </Button>
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
                        <Button
                          key={i}
                          variant={currentPage === i ? "default" : "outline"}
                          size="sm"
                          onClick={() => table.setPageIndex(i)}
                          className="text-xs px-2 py-1 h-8 w-8"
                        >
                          {i + 1}
                        </Button>
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
                      <Button
                        key={pageCount - 1}
                        variant={
                          currentPage === pageCount - 1 ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => table.setPageIndex(pageCount - 1)}
                        className="text-xs px-2 py-1 h-8 w-8"
                      >
                        {pageCount}
                      </Button>
                    );
                  }

                  return pages;
                })()}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageIndex((p) => p + 1)}
                disabled={
                  pageIndex + 1 >= Math.max(1, Math.ceil(totalCount / pageSize))
                }
                className="text-xs px-3 py-1 h-8"
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPageIndex(
                    Math.max(0, Math.ceil(totalCount / pageSize) - 1)
                  )
                }
                disabled={
                  pageIndex + 1 >= Math.max(1, Math.ceil(totalCount / pageSize))
                }
                className="text-xs px-2 py-1 h-8"
              >
                {">>"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
