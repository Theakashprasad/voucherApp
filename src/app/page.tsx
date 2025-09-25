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
  Plus,
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
import Navbar from "@/components/common/navbar";
import { SupplierDialog } from "@/components/supplier/page";
import { VoucherBookDialog } from "@/components/voucherBook/page";
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

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [branchName, setBranchName] = useState<string>("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
    { id: "status", value: "pending" },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    status: false,
  });
  const [columnVisibilityLoaded, setColumnVisibilityLoaded] = useState(false);
  const [data, setData] = useState<Voucher[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [overallTotalCount, setOverallTotalCount] = useState(0);
  const [overallGrandTotalNetBalance, setOverallGrandTotalNetBalance] =
    useState(0);
  const [filteredGrandTotalNetBalance, setFilteredGrandTotalNetBalance] =
    useState(0);
  const [
    filteredTotalCountExcludingCancelled,
    setFilteredTotalCountExcludingCancelled,
  ] = useState(0);

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
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const branchIdFromStorage =
        typeof parsed?._id === "string" ? parsed._id : null;

      if (!branchIdFromStorage) return;

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
      // Get branch ID from localStorage
      const raw = localStorage.getItem("branchDetails");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const branchIdFromStorage =
        typeof parsed?._id === "string" ? parsed._id : null;
      const branchNameFromStorage =
        typeof parsed?.name === "string"
          ? parsed.name
          : typeof parsed?.branchName === "string"
          ? parsed.branchName
          : typeof parsed?.branch?.name === "string"
          ? parsed.branch.name
          : "";

      if (!branchIdFromStorage) return;
      if (branchNameFromStorage) setBranchName(branchNameFromStorage);
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
        if (statusFilter)
          params.set("status", statusFilter.trim().toLowerCase());

        // Build URLs
        const filteredUrl = `/api/voucherEntry/${branchIdFromStorage}?${params.toString()}`; // Table data with current filters

        // Build URLs for totals excluding cancelled
        const buildTotalsUrl = (
          status: "pending" | "active" | "cancel",
          withFilters: boolean
        ) => {
          const p = new URLSearchParams();
          if (withFilters) {
            // include current filters but override status
            params.forEach((value, key) => {
              if (key !== "page" && key !== "pageSize" && key !== "status") {
                p.set(key, value);
              }
            });
          }
          p.set("status", status);
          return `/api/voucherEntry/${branchIdFromStorage}?${p.toString()}`;
        };

        const filteredPendingUrl = buildTotalsUrl("pending", true);
        const filteredActiveUrl = buildTotalsUrl("active", true);
        const filteredCancelUrl = buildTotalsUrl("cancel", true);
        const overallPendingUrl = buildTotalsUrl("pending", false);
        const overallActiveUrl = buildTotalsUrl("active", false);

        // Fetch table data and four totals in parallel
        const [
          resFiltered,
          resFiltPending,
          resFiltActive,
          resFiltCancel,
          resOverPending,
          resOverActive,
        ] = await Promise.all([
          fetch(filteredUrl),
          fetch(filteredPendingUrl),
          fetch(filteredActiveUrl),
          fetch(filteredCancelUrl),
          fetch(overallPendingUrl),
          fetch(overallActiveUrl),
        ]);
        if (!resFiltered.ok) throw new Error("Failed to fetch vouchers");
        if (!resFiltPending.ok || !resFiltActive.ok || !resFiltCancel.ok)
          throw new Error("Failed to fetch filtered totals");
        if (!resOverPending.ok || !resOverActive.ok)
          throw new Error("Failed to fetch overall totals");

        const [
          response,
          respFiltPending,
          respFiltActive,
          respFiltCancel,
          respOverPending,
          respOverActive,
        ] = await Promise.all([
          resFiltered.json(),
          resFiltPending.json(),
          resFiltActive.json(),
          resFiltCancel.json(),
          resOverPending.json(),
          resOverActive.json(),
        ]);

        const vouchers: Voucher[] = Array.isArray(response)
          ? response
          : response.vouchers || [];
        setData(vouchers);
        if (!Array.isArray(response)) {
          // Table count (can include cancelled if not filtered out by user)
          setTotalCount(Number(response.totalCount || 0));
        } else {
          setTotalCount(vouchers.length);
        }

        // Filtered totals based on Payment Status selection
        const filtCountPending = Number(respFiltPending?.totalCount || 0);
        const filtCountActive = Number(respFiltActive?.totalCount || 0);
        const filtCountCancel = Number(respFiltCancel?.totalCount || 0);
        const filtNetPending = Number(
          respFiltPending?.grandTotalNetBalance || 0
        );
        const filtNetActive = Number(respFiltActive?.grandTotalNetBalance || 0);
        const filtNetCancel = Number(respFiltCancel?.grandTotalNetBalance || 0);

        const statusFilterValue = (
          table.getColumn("status")?.getFilterValue() as string | undefined
        )?.trim();

        if (statusFilterValue === "pending") {
          setFilteredTotalCountExcludingCancelled(filtCountPending);
          setFilteredGrandTotalNetBalance(filtNetPending);
        } else if (statusFilterValue === "active") {
          setFilteredTotalCountExcludingCancelled(filtCountActive);
          setFilteredGrandTotalNetBalance(filtNetActive);
        } else if (statusFilterValue === "cancel") {
          setFilteredTotalCountExcludingCancelled(filtCountCancel);
          setFilteredGrandTotalNetBalance(filtNetCancel);
        } else {
          // Default: exclude cancelled (Pending + Active)
          setFilteredTotalCountExcludingCancelled(
            filtCountPending + filtCountActive
          );
          setFilteredGrandTotalNetBalance(filtNetPending + filtNetActive);
        }

        // Overall totals excluding cancelled = pending + active
        const overCountPending = Number(respOverPending?.totalCount || 0);
        const overCountActive = Number(respOverActive?.totalCount || 0);
        const overNetPending = Number(
          respOverPending?.grandTotalNetBalance || 0
        );
        const overNetActive = Number(respOverActive?.grandTotalNetBalance || 0);
        setOverallTotalCount(overCountPending + overCountActive);
        setOverallGrandTotalNetBalance(overNetPending + overNetActive);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchVouchers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
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
        const isCancelled = row.original.status === "cancel";
        const handleStatusChange = async (checked: boolean) => {
          const now = new Date();
          const local = new Date(
            now.getTime() - now.getTimezoneOffset() * 60000
          );
          const today = local.toISOString().slice(0, 10);
          const newStatus: Voucher["status"] = checked ? "active" : "pending";

          // Calculate net balance considering discount/advance
          const voucher = row.original;
          const netBalance = checked
            ? voucher.amount -
              voucher.dues -
              voucher.return -
              voucher.discountAdvance
            : voucher.amount; // Reset to original amount when unpaid

          // Optimistic update
          const previous = data;
          const optimistic: Voucher[] = data.map((v) =>
            v._id === row.original._id
              ? {
                  ...v,
                  chqCashIssuedDate: checked ? today : "",
                  voucherClearedDate: checked ? today : "",
                  amountPaid: checked ? netBalance : 0, // Use calculated net balance
                  netBalance: netBalance, // Update net balance
                  status: newStatus,
                }
              : v
          );
          setData(optimistic);

          try {
            const res = await fetch("/api/voucherEntry/paid", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                voucherEntryId: row.original._id,
                voucherClearedDate: checked ? today : "",
                chqCashIssuedDate: checked ? today : "",
                amountPaid: checked ? netBalance : 0, // Use calculated net balance
                netBalance: netBalance, // Send net balance to API
                status: newStatus,
              }),
            });

            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              setData(previous);
              toast.error(err?.error || "Failed to update voucher status");
            } else {
              const payload = await res.json().catch(() => null);
              if (payload?.voucher) {
                setData((prev) => {
                  const updated = prev.map((v) =>
                    v._id === row.original._id
                      ? (payload.voucher as Voucher)
                      : v
                  );

                  return updated;
                });
              }
            }
          } catch {
            setData(previous);
            toast.error("Error updating voucher status");
          }
        };

        const checkbox = (
          <div className="flex items-center justify-center">
            <div
              className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                isPaid
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-300"
              } ${
                isCancelled
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:border-gray-400"
              }`}
              aria-disabled={isCancelled}
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

        if (isCancelled) {
          // Disabled when cancelled: no dialog, no action
          return checkbox;
        }

        return (
          <ConfirmDialog
            triggerLabel={checkbox}
            title={isPaid ? "Mark as Unpaid? ❌" : "Mark as Paid? ✅"}
            description={
              isPaid
                ? `Are you sure you want to mark voucher #${row.original.voucherNo} as unpaid? This will clear the payment dates.`
                : `Are you sure you want to mark voucher #${row.original.voucherNo} as paid? This will set today's date as the payment date.`
            }
            confirmLabel={isPaid ? "Mark Unpaid" : "Mark Paid"}
            cancelLabel="Cancel"
            onConfirm={() => handleStatusChange(!isPaid)}
          />
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

        return (
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() =>
                router.push(`/branch/editVoucherEntry/${voucher._id}`)
              }
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit voucher</span>
            </Button>
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

  // Note: Cards display overall totals; we also show filtered totals below them

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

  const handleExportExcel = async () => {
    try {
      const raw = localStorage.getItem("branchDetails");
      if (!raw) {
        toast.error("Branch not selected");
        return;
      }
      const parsed = JSON.parse(raw);
      const branchIdFromStorage =
        typeof parsed?._id === "string" ? parsed._id : null;
      if (!branchIdFromStorage) {
        toast.error("Invalid branch");
        return;
      }

      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "1000000");

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

      // Always export all statuses; intentionally ignore current status filter

      const url = `/api/voucherEntry/${branchIdFromStorage}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch all vouchers for export");
      const payload = await res.json();
      const rows: Voucher[] = Array.isArray(payload)
        ? payload
        : payload.vouchers || [];

      const wb = createExcelFile(rows);

      const today = new Date().toISOString().slice(0, 10);
      const safeBranch = (branchName || "branch").replace(
        /[^a-z0-9-_]+/gi,
        "-"
      );
      const filename = `vouchers_${safeBranch}_${today}_all.xlsx`;

      XLSX.writeFile(wb, filename);
      toast.success(`Excel file exported successfully: ${filename}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to export Excel");
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Header Section */}
        <div className="bg-transparent backdrop-blur-sm ">
          <div className=" mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"></h1>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/branch/createVoucherEntry")}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-lg hover:shadow-md hover:scale-105 transition-all duration-200 focus:ring-2 focus:ring-green-200 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Create Voucher
                </button>
                <SupplierDialog />
                <VoucherBookDialog />
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
                    {overallTotalCount}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Filtered : {filteredTotalCountExcludingCancelled}
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
                    ₹{overallGrandTotalNetBalance.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Filtered : ₹
                    {filteredGrandTotalNetBalance.toLocaleString("en-IN")}
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
                    <option value="cancel">Cancelled</option>
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

                <div className="relative">
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
                </div>
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
                      const value = e.target.value;
                      if (value === "all") {
                        setPageIndex(0);
                        setPageSize(1000000);
                      } else {
                        table.setPageSize(Number(value));
                      }
                    }}
                    className="px-3 py-1 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                  >
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <option key={pageSize} value={pageSize}>
                        {pageSize}
                      </option>
                    ))}
                    <option value="all">Show All</option>
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
