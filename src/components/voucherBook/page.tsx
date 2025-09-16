"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type Voucher = { name: string; start: number; end: number };

export function VoucherBookDialog() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [creatingIndex, setCreatingIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      async function getData() {
        const raw = localStorage.getItem("branchDetails");
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const branchIdFromStorage =
          typeof parsed?._id === "string" ? parsed._id : null;
        if (!branchIdFromStorage) return;
        setBranchId(branchIdFromStorage);

        // Attempt to fetch branch by id if available; otherwise fall back to localStorage
        const res = await fetch(`/api/branch/${branchIdFromStorage}`).catch(
          () => null
        );
        if (res && res.ok) {
          const branchData = await res.json();
          const list = Array.isArray(branchData?.vouchers)
            ? branchData.vouchers
            : [];
          setVouchers(
            list.map((v: Record<string, unknown>) => ({
              name: String(v?.name || ""),
              start: Number(v?.start || 0),
              end: Number(v?.end || 0),
            }))
          );
        } else if (Array.isArray(parsed?.vouchers)) {
          setVouchers(
            parsed.vouchers.map((v: Record<string, unknown>) => ({
              name: String(v?.name || ""),
              start: Number(v?.start || 0),
              end: Number(v?.end || 0),
            }))
          );
        }
      }
      getData();
    } catch (error) {
      console.error("Error loading voucher books:", error);
      setBranchId("");
      setVouchers([]);
    }
  }, []);

  const handleChange = (index: number, field: keyof Voucher, value: string) => {
    setVouchers((prev) => {
      const next = [...prev];
      const updated: Voucher = {
        ...next[index],
        [field]: field === "name" ? value : Number(value),
      } as Voucher;
      next[index] = updated;
      return next;
    });
  };

  const handleAdd = () => {
    setVouchers((prev) => {
      const next = [...prev, { name: "", start: 1, end: 1 }];
      const idx = next.length - 1;
      setCreatingIndex(idx);
      setEditingIndex(idx);
      return next;
    });
  };

  const handleSaveNew = async (index: number) => {
    const vb = vouchers[index];
    const name = vb.name.trim();
    if (!branchId) return toast.error("Branch not found");
    if (!name || !vb.start || !vb.end || vb.start > vb.end)
      return toast.error("Enter name and valid range");
    if (
      vouchers.some(
        (v, i) => i !== index && v.name.toLowerCase() === name.toLowerCase()
      )
    )
      return toast.error("Voucher book exists");
    try {
      setLoading(true);
      const res = await fetch("/api/branch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          action: "addVoucher",
          name,
          start: vb.start,
          end: vb.end,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return toast.error(err?.error || "Failed to add voucher book");
      }
      setCreatingIndex(null);
      setEditingIndex(null);
      toast.success("Voucher book added");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (index: number) => {
    const vb = vouchers[index];
    const name = vb.name.trim();
    if (!branchId) return toast.error("Branch not found");
    if (!name || !vb.start || !vb.end || vb.start > vb.end)
      return toast.error("Enter name and valid range");
    if (
      vouchers.some(
        (v, i) => i !== index && v.name.toLowerCase() === name.toLowerCase()
      )
    )
      return toast.error("Voucher book exists");
    try {
      setLoading(true);
      const res = await fetch("/api/branch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          action: "editVoucher",
          voucherIndex: index,
          name,
          start: vb.start,
          end: vb.end,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return toast.error(err?.error || "Failed to save voucher book");
      }
      setEditingIndex(null);
      toast.success("Voucher book saved");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (index: number) => {
    if (!branchId) return toast.error("Branch not found");
    try {
      setLoading(true);
      const res = await fetch("/api/branch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          action: "deleteVoucher",
          voucherIndex: index,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return toast.error(err?.error || "Failed to delete voucher book");
      }
      setVouchers((prev) => prev.filter((_, i) => i !== index));
      setEditingIndex(null);
      setCreatingIndex(null);
      toast.success("Voucher book deleted");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Voucher Book</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Voucher Books</DialogTitle>
          <DialogDescription>
            Manage voucher books configured for this branch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[350px] overflow-y-auto p-2">
          {vouchers.map((vb, index) => (
            <div
              key={`vb-${index}`}
              className="flex items-center justify-between border rounded-lg p-2 gap-3"
            >
              {editingIndex === index ? (
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <Input
                    value={vb.name}
                    onChange={(e) =>
                      handleChange(index, "name", e.target.value)
                    }
                    placeholder="Book name"
                  />
                  <Input
                    type="number"
                    value={vb.start}
                    onChange={(e) =>
                      handleChange(index, "start", e.target.value)
                    }
                    placeholder="Start"
                  />
                  <Input
                    type="number"
                    value={vb.end}
                    onChange={(e) => handleChange(index, "end", e.target.value)}
                    placeholder="End"
                  />
                </div>
              ) : (
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {vb.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    Range: {vb.start} - {vb.end}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {editingIndex === index ? (
                  creatingIndex === index ? (
                    <Button
                      size="sm"
                      onClick={() => handleSaveNew(index)}
                      disabled={loading}
                    >
                      Add
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(index)}
                      disabled={loading}
                    >
                      Save
                    </Button>
                  )
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingIndex(index);
                      setCreatingIndex(null);
                    }}
                  >
                    Edit
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(index)}
                  disabled={loading}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={handleAdd}
            className="flex items-center gap-2 w-full"
          >
            <Plus className="w-4 h-4" /> Add Voucher Book
          </Button>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
