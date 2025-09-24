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
            data.map((b: Record<string, unknown>) => ({
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="w-full p-6 py-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-2">
                Manage branches and navigate to details
              </p>
            </div>
            <Button
              onClick={() =>
                router.push("/admin/dashboard/branch/createbranch")
              }
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-lg hover:shadow-md hover:scale-105 transition-all duration-200 focus:ring-2 focus:ring-green-200 text-sm"
            >
              <Plus className="h-4 w-4" />
              Create Branch
            </Button>
          </div>

          <div className="mb-6">
            <div className="relative max-w-sm">
              <Input
                placeholder="Search branches..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full">
                  <svg
                    className="h-8 w-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {branches.length === 0
                      ? "No branches found"
                      : "No matching branches"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {branches.length === 0
                      ? "Create your first branch to get started."
                      : "Try adjusting your search terms."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((b) => (
                <Link
                  key={b._id}
                  href={`/admin/dashboard/branch/${b._id}/details`}
                  onClick={() =>
                    localStorage.setItem(
                      "branchDetails",
                      JSON.stringify({ _id: b._id })
                    )
                  }
                  className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 p-6 hover:scale-105"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        router.push(`/admin/dashboard/branch/${b._id}/edit`);
                      }}
                    >
                      <Edit className="h-3 w-3" /> Edit
                    </button>
                  </div>

                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Branch
                    </p>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                      {b.branchName || "—"}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors duration-200">
                      View details →
                    </span>
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
