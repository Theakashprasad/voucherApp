"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Edit } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<
    Array<{ _id: string; branchName: string }>
  >([]);

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

  return (
    <div className="min-h-screen w-full p-6 sm:p-10">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-6">
          Admin Dashboard
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => (
            <Link
              key={b._id}
              href={`/admin/dashboard/branch/${b._id}`}
              className="rounded-lg border border-black/10 dark:border-white/20 p-4 bg-white dark:bg-black/20 hover:bg-black/[.04] dark:hover:bg-white/[.06] transition"
            >
              <div className="text-sm text-black/60 dark:text-white/70">
                Branch
              </div>
              <div className="text-lg font-semibold">{b.branchName || "—"}</div>
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
      </div>
    </div>
  );
}
