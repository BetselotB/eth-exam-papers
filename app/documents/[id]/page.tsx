"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { UserService } from "@/lib/userService";

export default function DocumentBundlePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState<any>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await UserService.getBundleWithDocuments(params.id);
        if (!data) return;
        setBundle({
          ...data,
          docs: data.documents.map((d: any) => ({
            ...d,
            url: UserService.getPublicUrl(d.file_path),
          })),
        });
        setActiveDocId(data.documents?.[0]?.id ?? null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [params.id]);

  const active = useMemo(() => {
    if (!bundle || !activeDocId) return null;
    return bundle.docs.find((d: any) => d.id === activeDocId) || null;
  }, [bundle, activeDocId]);

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

  if (!bundle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-600">Bundle not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              Back to dashboard
            </Link>
            <span className="text-gray-400">/</span>
            <span className="font-semibold text-gray-900">{bundle.name}</span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Files</h2>
            <ul className="space-y-2 max-h-[60vh] overflow-auto">
              {bundle.docs.map((doc: any) => (
                <li key={doc.id}>
                  <button
                    onClick={() => setActiveDocId(doc.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border ${
                      doc.id === activeDocId
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:bg-gray-50 text-gray-800"
                    }`}
                  >
                    <div className="truncate text-sm">
                      {doc.file_path.split("/").pop()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {doc.mime_type || "file"}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {active ? (
              <div className="aspect-[16/10] bg-gray-100">
                <iframe
                  src={`${active.url}#toolbar=1&navpanes=0&statusbar=0&page=1`}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center text-gray-400">
                No file selected
              </div>
            )}
            <div className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{bundle.name}</h3>
                <p className="text-sm text-gray-500">{bundle.category}</p>
              </div>
              {active && (
                <a
                  href={active.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Open in new tab
                </a>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
