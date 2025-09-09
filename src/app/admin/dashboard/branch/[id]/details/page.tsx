"use client";

import * as React from "react";
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
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Edit,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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

// Data is fetched from API; no static data here.

export type Voucher = {
  id: string;
  voucherId: string;
  date: string;
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

export const columns: ColumnDef<Voucher>[] = [
  {
    accessorKey: "voucherId",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Voucher ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-mono font-medium text-blue-600">
        {row.getValue("voucherId")}
      </div>
    ),
  },
  {
    accessorKey: "date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div>{row.getValue("date")}</div>,
  },
  {
    accessorKey: "voucherGivenDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Voucher Given Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div>{row.getValue("voucherGivenDate")}</div>,
  },
  {
    accessorKey: "supplier",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Supplier
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("supplier")}</div>
    ),
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "dues",
    header: () => <div className="text-right">Dues</div>,
    cell: ({ row }) => {
      const dues = parseFloat(row.getValue("dues"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(dues);
      return <div className="text-right">{formatted}</div>;
    },
  },
  {
    accessorKey: "return",
    header: () => <div className="text-right">Return</div>,
    cell: ({ row }) => {
      const returnAmount = parseFloat(row.getValue("return"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(returnAmount);
      return <div className="text-right">{formatted}</div>;
    },
  },
  {
    accessorKey: "discountAdvance",
    header: () => <div className="text-right">Discount/Advance</div>,
    cell: ({ row }) => {
      const discountAdvance = parseFloat(row.getValue("discountAdvance"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(discountAdvance);
      return <div className="text-right">{formatted}</div>;
    },
  },
  {
    accessorKey: "netBalance",
    header: () => <div className="text-right">Net Balance</div>,
    cell: ({ row }) => {
      const netBalance = parseFloat(row.getValue("netBalance"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(netBalance);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "modeOfPayment",
    header: "Mode of Payment",
    cell: ({ row }) => <div>{row.getValue("modeOfPayment")}</div>,
  },
  {
    accessorKey: "chqCashIssuedDate",
    header: "CHQ/Cash Issued Date",
    cell: ({ row }) => <div>{row.getValue("chqCashIssuedDate") || "-"}</div>,
  },
  {
    accessorKey: "amountPaid",
    header: () => <div className="text-right">Amount Paid</div>,
    cell: ({ row }) => {
      const amountPaid = parseFloat(row.getValue("amountPaid"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amountPaid);
      return <div className="text-right">{formatted}</div>;
    },
  },
  {
    accessorKey: "voucherClearedDate",
    header: "Voucher Cleared Date",
    cell: ({ row }) => <div>{row.getValue("voucherClearedDate") || "-"}</div>,
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
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const voucher = row.original;

      return (
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit voucher</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete voucher</span>
          </Button>
        </div>
      );
    },
  },
];

export default function page({ params }: { params: Promise<{ id: string }> }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [data, setData] = React.useState<Voucher[]>([]);

  // Unwrap route params
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { id: branchId } = React.use(params);

  // Fetch vouchers for this branch
  React.useEffect(() => {
    const run = async () => {
      if (!branchId) return;
      try {
        const res = await fetch(`/api/voucherEntry/${branchId}`);
        if (!res.ok) return;
        const vouchers = await res.json();
        const mapped: Voucher[] = Array.isArray(vouchers)
          ? vouchers.map((v: any) => ({
              id: String(v._id),
              voucherId: String(v.voucherNo ?? ""),
              date: v.date ? String(v.date).slice(0, 10) : "",
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
            }))
          : [];
        setData(mapped);
      } catch {
        setData([]);
      }
    };
    run();
  }, [branchId]);

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
    },
  });

  // Calculate totals
  const grandTotalAmount = data.reduce(
    (sum, voucher) => sum + voucher.amount,
    0
  );
  const grandTotalNetBalance = data.reduce(
    (sum, voucher) => sum + voucher.netBalance,
    0
  );

  return (
    <div className="w-full">
      {/* Summary Dashboard Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Voucher Summary Dashboard</h1>

        {/* Summary Totals */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">
              Grand Total Amount
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(grandTotalAmount)}
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">
              Grand Total Net Balance
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(grandTotalNetBalance)}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center py-4">
          <Input
            placeholder="Search by name, voucher number..."
            value={
              (table.getColumn("supplier")?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn("supplier")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Columns <ChevronDown />
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
                      className="capitalize"
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

      {/* Voucher Table */}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
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
                    <TableCell key={cell.id}>
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
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination and Row Selection */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
        {/* Page Size Selection */}
        <div className="flex items-center gap-2 text-xs">
          <span>Rows per page:</span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
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
              {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
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
                const pageCount = table.getPageCount();
                const currentPage = table.getState().pagination.pageIndex;
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
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="text-xs px-3 py-1 h-8"
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="text-xs px-2 py-1 h-8"
            >
              {">>"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
