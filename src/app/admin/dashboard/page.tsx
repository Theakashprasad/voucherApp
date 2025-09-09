"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Edit, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<
    Array<{ _id: string; branchName: string }>
  >([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await fetch(`/api/branch`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setBranches(
            data.map((b: any) => ({
              _id: String(b._id),
              branchName: String(b.branchName || ""),
            }))
          );
        }
      } catch {
        // ignore
      }
    };
    loadBranches();
  }, []);

  const filtered = useMemo(
    () =>
      branches.filter((b) =>
        b.branchName.toLowerCase().includes(query.toLowerCase())
      ),
    [branches, query]
  );

  return (
    <div className="min-h-screen w-full p-8 sm:p-12">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
              Admin Dashboard
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Manage branches and navigate to details
            </p>
          </div>
          <Button
            size="sm"
            className="text-xs"
            onClick={() => router.push("/admin/dashboard/branch/createbranch")}
          >
            <Plus className="w-4 h-4 mr-1" /> Create Branch
          </Button>
        </div>

        <div className="mb-4">
          <Input
            placeholder="Search branches..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm text-sm"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-gray-500">
            {branches.length === 0
              ? "No branches found. Create your first branch to get started."
              : "No branches match your search."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((b) => (
              <Link
                key={b._id}
                href={`/admin/dashboard/branch/${b._id}/details`}
                className="rounded-lg border p-5 bg-white hover:shadow transition"
              >
                <div className="text-xs text-gray-500">Branch</div>
                <div className="text-xl font-semibold text-gray-900">
                  {b.branchName || "—"}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-blue-600">View details →</span>
                  <button
                    className="inline-flex items-center gap-1 text-gray-700 hover:text-blue-600"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(`/admin/dashboard/branch/${b._id}/edit`);
                    }}
                  >
                    <Edit className="h-4 w-4" /> Edit
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
