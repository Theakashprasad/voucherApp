"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { toast, Toaster } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function SupplierDialog() {
  const [suppliers, setSuppliers] = useState<string[]>([]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [creatingIndex, setCreatingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [branchId, setBranchId] = useState<string | null>(null);

  useEffect(() => {
    // Get branch ID from localStorage
    try {
      async function getData() {
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
        const supplierName = suppliers[index];
        setSuppliers((previousSuppliers) =>
          previousSuppliers.filter((_, i) => i !== index)
        );
        setEditingIndex(null);
        setCreatingIndex(null);
        toast.success(`Supplier "${supplierName}" deleted successfully!`);
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
      <Toaster position="top-right" expand={true} />

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
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete the supplier "{supplier}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(index)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={loading}
                      >
                        {loading ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
