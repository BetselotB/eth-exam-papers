"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { UserService } from "@/lib/userService";
import { UserStats } from "@/types/user";
import Link from "next/link";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feed, setFeed] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Remove the conflicting redirect logic - middleware handles this
  // useEffect(() => {
  //   if (!loading && !user) {
  //     router.push("/login");
  //   }
  // }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadUserStats();
      loadFeed({ reset: true });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadFeed({ reset: true });
    }
  }, [search, category]);

  const loadUserStats = async () => {
    try {
      const stats = await UserService.getUserStats();
      setUserStats(stats);
    } catch (error) {
      console.error("Error loading user stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadFeed = async ({ reset = false }: { reset?: boolean } = {}) => {
    try {
      setFeedLoading(true);
      const bundles = await UserService.listBundles({
        query: search,
        category,
        limit: 24,
        cursor: reset ? null : cursor,
      });
      const withUrls = bundles.map((b) => {
        const first = b.documents?.[0] || null;
        const previewUrl = first
          ? UserService.getPublicUrl(first.file_path)
          : null;
        return { ...b, previewUrl };
      });
      if (reset) {
        setFeed(withUrls);
      } else {
        setFeed((prev) => [...prev, ...withUrls]);
      }
      setCursor(
        withUrls.length ? withUrls[withUrls.length - 1].created_at : null
      );
    } catch (error) {
      console.error("Error loading feed:", error);
    } finally {
      setFeedLoading(false);
    }
  };

  const categories = useMemo(
    () => [
      { key: "all", label: "All" },
      { key: "math", label: "Math" },
      { key: "science", label: "Science" },
      { key: "engineering", label: "Engineering" },
      { key: "cs", label: "Computer Science" },
      { key: "language", label: "Language" },
      { key: "other", label: "Other" },
    ],
    []
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">
                ExamPapers
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {user.email}</span>
              <Link
                href="/profile"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Profile
              </Link>
              <button
                onClick={signOut}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Community Documents
          </h1>
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-md p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
              <div className="flex-1 flex items-center gap-3">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or description..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  setSelectedFiles([]);
                  setUploadOpen(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                Upload Document
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Documents Viewed
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading
                    ? "..."
                    : `${userStats?.documents_viewed || 0} / 20`}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Documents Downloaded
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? "..." : userStats?.documents_downloaded || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Account Status
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {statsLoading
                    ? "..."
                    : userStats?.remaining_free_views === 0
                    ? "Limit Reached"
                    : "Free"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feed Grid */}
        <div className="mt-8">
          {feedLoading && feed.length === 0 ? (
            <div className="text-center text-gray-600">
              Loading documents...
            </div>
          ) : feed.length === 0 ? (
            <div className="text-center text-gray-600">No documents found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {feed.map((bundle) => (
                <div
                  key={bundle.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden"
                >
                  {bundle.previewUrl ? (
                    <div className="aspect-[16/10] bg-gray-100">
                      <iframe
                        src={`${bundle.previewUrl}#toolbar=0&navpanes=0&statusbar=0&page=1`}
                        className="w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-400">
                      No preview
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {bundle.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {bundle.category}
                        </p>
                      </div>
                      <Link
                        href={`/documents/${bundle.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </div>
                    {bundle.description && (
                      <p className="text-gray-600 text-sm mt-2 line-clamp-3">
                        {bundle.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {bundle.documents?.length || 0} file(s)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {feed.length > 0 && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => loadFeed({ reset: false })}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black/80"
              >
                Load more
              </button>
            </div>
          )}
        </div>

        {/* Paywall Notice */}
        {userStats && userStats.remaining_free_views === 0 ? (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Free Limit Reached
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    You've reached your free document limit. Upload documents to
                    continue accessing exam papers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Free Trial Notice
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    You have {userStats?.remaining_free_views || 20} free
                    document views remaining. After that, you'll need to upload
                    papers to continue accessing content.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white text-gray-900 rounded-xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Document</h3>
              <button
                onClick={() => setUploadOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget as HTMLFormElement;
                const nameInput = form.elements.namedItem(
                  "name"
                ) as HTMLInputElement;
                const categoryInput = form.elements.namedItem(
                  "category"
                ) as HTMLSelectElement;
                const customCategoryInput = form.elements.namedItem(
                  "customCategory"
                ) as HTMLInputElement;
                const descInput = form.elements.namedItem(
                  "description"
                ) as HTMLInputElement;
                const files = selectedFiles;
                if (files.length === 0) return;
                const finalCategory =
                  categoryInput.value === "custom" &&
                  customCategoryInput.value.trim()
                    ? customCategoryInput.value.trim()
                    : categoryInput.value;
                setUploading(true);
                const res = await UserService.uploadDocuments({
                  files,
                  name: nameInput.value,
                  category: finalCategory,
                  description: descInput.value,
                });
                setUploading(false);
                if (res && res.results && res.results.length) {
                  setUploadOpen(false);
                  setSearch("");
                  setCategory("all");
                  setSelectedFiles([]);
                  await loadFeed({ reset: true });
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm text-gray-700 mb-1">Name</label>
                <input
                  name="name"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Category
                </label>
                <select
                  name="category"
                  defaultValue="other"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  onChange={(e) => {
                    const custom =
                      (e.currentTarget.form?.elements.namedItem(
                        "customCategory"
                      ) as HTMLInputElement) || null;
                    if (custom)
                      custom.style.display =
                        e.target.value === "custom" ? "block" : "none";
                  }}
                >
                  {categories
                    .filter((c) => c.key !== "all")
                    .map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  <option value="custom">Custom</option>
                </select>
                <input
                  name="customCategory"
                  placeholder="Enter custom category"
                  className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  style={{ display: "none" }}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Description
                </label>
                <input
                  name="description"
                  placeholder="Optional"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  File(s)
                </label>
                <input
                  ref={fileInputRef}
                  name="files"
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.ppt,.pptx"
                  className="w-full text-gray-900"
                  onChange={(e) => {
                    const next = e.target.files
                      ? Array.from(e.target.files)
                      : [];
                    if (next.length === 0) return;
                    setSelectedFiles((prev) => {
                      const seen = new Set(
                        prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`)
                      );
                      const additions = next.filter(
                        (f) =>
                          !seen.has(`${f.name}-${f.size}-${f.lastModified}`)
                      );
                      return [...prev, ...additions];
                    });
                    // reset input so the same selection can be added again
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700">
                        {selectedFiles.length} file
                        {selectedFiles.length > 1 ? "s" : ""} selected
                      </span>
                      <button
                        type="button"
                        className="text-sm text-red-600 hover:underline"
                        onClick={() => setSelectedFiles([])}
                      >
                        Clear all
                      </button>
                    </div>
                    <ul className="max-h-40 overflow-auto space-y-1">
                      {selectedFiles.map((f, idx) => (
                        <li
                          key={`${f.name}-${f.size}-${f.lastModified}`}
                          className="flex items-center justify-between text-sm bg-gray-50 border border-gray-200 rounded px-2 py-1"
                        >
                          <span className="truncate mr-3">{f.name}</span>
                          <button
                            type="button"
                            className="text-gray-500 hover:text-gray-700"
                            onClick={() =>
                              setSelectedFiles((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
