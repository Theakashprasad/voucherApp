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

export function SupplierDialog() {
  const [suppliers, setSuppliers] = useState<string[]>([]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [creatingIndex, setCreatingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [branchId, setBranchId] = useState<string | null>(null);

  useEffect(() => {
    // Get branch ID from localStorage
    try {
      console.log("sd");
      async function getData() {
        console.log("sd");
        const raw = localStorage.getItem("branchDetails");
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const branchIdFromStorage =
          typeof parsed?._id === "string" ? parsed._id : null;

        if (!branchIdFromStorage) return;

        setBranchId(branchIdFromStorage);

        const res = await fetch(`/api/branch/${branchIdFromStorage}`);
        if (res.ok) {
          const branchData = await res.json();
          // console.log("Branch data from API:", );
          setSuppliers(
            Array.isArray(branchData.Supplier) ? branchData.Supplier : []
          );
        }

        //   setVoucherBookOptions(mapped);
      }
      getData();
    } catch (error) {
      console.error("Error loading branch data:", error);
      setBranchId("");
      setSuppliers([]);
    }
  }, [setBranchId, setSuppliers]);

  const handleChange = async (index: number, value: string) => {
    setSuppliers((previousSuppliers) => {
      const nextSuppliers = [...previousSuppliers];
      nextSuppliers[index] = value;
      return nextSuppliers;
    });
  };

  const handleDelete = async (index: number) => {
    if (!branchId) {
      toast.error("Branch not found. Please select a branch and try again.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/branch/supplier/${branchId}`, {
        method: "DELETE",
        body: JSON.stringify({ id: index, branchId }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setSuppliers((previousSuppliers) =>
          previousSuppliers.filter((_, i) => i !== index)
        );
        setEditingIndex(null);
        setCreatingIndex(null);
        toast.success("Supplier deleted.");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(
          data?.error || "Failed to delete supplier. Please try again."
        );
      }
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast.error("Error deleting supplier. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSuppliers((previousSuppliers) => {
      const nextSuppliers = [...previousSuppliers, ""];
      const newIndex = nextSuppliers.length - 1;
      setEditingIndex(newIndex);
      setCreatingIndex(newIndex);
      return nextSuppliers;
    });
  };

  const handleSaveCreate = async (index: number) => {
    const name = (suppliers[index] || "").trim();

    if (!name) {
      toast.error("Supplier name is required.");
      return;
    }

    const exists = suppliers
      .map((n, i) => (i === index ? name : n))
      .some(
        (n, i) => i !== index && n.trim().toLowerCase() === name.toLowerCase()
      );
    if (exists) {
      toast.error("Supplier already exists.");
      return;
    }

    if (!branchId) {
      toast.error("Branch not found. Please select a branch and try again.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/branch", {
        method: "PATCH",
        body: JSON.stringify({ branchId, newSupplierName: name }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        toast.success("Supplier added.");
        setCreatingIndex(null);
        setEditingIndex(null);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || "Failed to add supplier. Please try again.");
      }
    } catch (error) {
      console.error("Error adding supplier:", error);
      toast.error("Error adding supplier. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (index: number) => {
    const name = (suppliers[index] || "").trim();

    if (!name) {
      toast.error("Supplier name is required.");
      return;
    }

    const existingNames = suppliers
      .map((n, i) => (i === index ? name : n))
      .map((n) => n.trim().toLowerCase());
    const duplicates = existingNames.filter((n) => n === name.toLowerCase());
    if (duplicates.length > 1) {
      toast.error("Supplier already exists.");
      return;
    }

    if (!branchId) {
      toast.error("Branch not found. Please select a branch and try again.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/branch/supplier/${branchId}`, {
        method: "PATCH",
        body: JSON.stringify({ id: index, value: name, branchId }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        toast.success("Supplier saved.");
        setEditingIndex(null);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(
          data?.error || "Failed to save supplier. Please try again."
        );
      }
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast.error("Error saving supplier. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Suppliers</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Manage Suppliers</DialogTitle>
          <DialogDescription>
            Edit, delete, or add a supplier. Only one can be edited at a time.
          </DialogDescription>
        </DialogHeader>

        {/* Supplier list */}
        <div className="space-y-3 max-h-[350px] overflow-y-auto p-2">
          {suppliers.map((supplier, index) => (
            <div
              key={index}
              className="flex items-center justify-between border rounded-lg p-2 gap-3"
            >
              {editingIndex === index ? (
                <Input
                  value={supplier}
                  onChange={(e) => handleChange(index, e.target.value)}
                  placeholder="Enter supplier name"
                  className="flex-1"
                />
              ) : (
                <span className="flex-1">{supplier}</span>
              )}

              <div className="flex gap-2">
                {editingIndex === index ? (
                  creatingIndex === index ? (
                    <Button size="sm" onClick={() => handleSaveCreate(index)}>
                      Add
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => handleSaveEdit(index)}>
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
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}

          {/* Add new supplier button */}
          <Button
            variant="outline"
            onClick={handleCreate}
            className="flex items-center gap-2 w-full"
          >
            <Plus className="w-4 h-4" /> Add Supplier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
