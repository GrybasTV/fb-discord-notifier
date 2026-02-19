"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

interface MonitoredPage {
  id: string;
  url: string;
  name: string | null;
  status: string;
  last_checked: string | null;
}

interface PostPreview {
  postUrl: string | null;
  text: string;
  imageUrl: string | null;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pages, setPages] = useState<MonitoredPage[]>([]);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [globalWebhook, setGlobalWebhook] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, string>>({});
  const [isTestingScrape, setIsTestingScrape] = useState(false);
  const [scrapeResults, setScrapeResults] = useState<PostPreview[] | null>(null);
  const [showScrapeModal, setShowScrapeModal] = useState(false);

  const fetchPages = useCallback(async () => {
    const res = await fetch("/api/pages");
    if (res.ok) {
      const data = await res.json();
      setPages(data);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/user/settings");
    if (res.ok) {
      const data = await res.json();
      setGlobalWebhook(data.default_discord_webhook_url || "");
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      let isMounted = true;
      const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchPages(), fetchSettings()]);
        if (isMounted) {
          setLoading(false);
        }
      };
      fetchData();
      return () => {
        isMounted = false;
      };
    }
  }, [status, router, fetchPages, fetchSettings]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    await fetch("/api/user/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ default_discord_webhook_url: globalWebhook }),
    });
    setIsSavingSettings(false);
    alert("Nustatymai išsaugoti!");
  };

  const handleAddPage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, name }),
    });

    if (res.ok) {
      setUrl("");
      setName("");
      fetchPages();
    }
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ar tikrai norite nustoti sekti šį puslapį?")) return;
    const res = await fetch(`/api/pages?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchPages();
    }
  };

  const handleTestPage = async (pageId: string) => {
    setTestStatus({ ...testStatus, [pageId]: "siunčiama..." });
    const res = await fetch("/api/test-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId }),
    });

    if (res.ok) {
      setTestStatus({ ...testStatus, [pageId]: "SĖKMĖ! ✅" });
      setTimeout(() => {
        setTestStatus((prev) => {
          const newState = { ...prev };
          delete newState[pageId];
          return newState;
        });
      }, 3000);
    } else {
      const data = await res.json();
      setTestStatus({ ...testStatus, [pageId]: "KLAIDA! ❌" });
      alert(data.error || "Nepavyko išsiųsti pranešimo.");
    }
  };

  const handleTestScrape = async () => {
    if (!url) {
      alert("Įveskite puslapio URL!");
      return;
    }

    setIsTestingScrape(true);
    try {
      // Start test scrape
      const res = await fetch("/api/test-scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "Nepavyko paleisti testo");
        setIsTestingScrape(false);
        return;
      }

      const requestId = data.requestId;

      // Poll for results
      const pollInterval = setInterval(async () => {
        const statusRes = await fetch(`/api/test-scrape?requestId=${requestId}`);
        const statusData = await statusRes.json();

        if (statusData.status === "completed") {
          clearInterval(pollInterval);
          setIsTestingScrape(false);
          setScrapeResults(statusData.posts);
          setShowScrapeModal(true);
        } else if (statusData.status === "error") {
          clearInterval(pollInterval);
          setIsTestingScrape(false);
          const errorMsg = statusData.posts?.error || "Nepavyko nuskaityti puslapio";
          alert("Klaida: " + errorMsg);
        }
        // If still pending, continue polling
      }, 3000); // Poll every 3 seconds

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isTestingScrape) {
          setIsTestingScrape(false);
          alert("Testas užtruko per ilgai. Pabandykite vėliau.");
        }
      }, 120000);
    } catch (error) {
      setIsTestingScrape(false);
      alert("Klaida: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 font-sans">
        <div className="text-lg font-medium text-gray-600 animate-pulse">Kraunama...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              FB Notifier Dashboard
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 hidden sm:inline">{session?.user?.email}</span>
              <button onClick={() => signOut()} className="text-sm font-semibold text-red-600">Atsijungti</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold mb-4">Bendri nustatymai</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Bendras Discord Webhook URL</label>
              <input
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full rounded-lg border-gray-300 border p-2.5 text-sm outline-none"
                value={globalWebhook}
                onChange={(e) => setGlobalWebhook(e.target.value)}
              />
            </div>
            <button onClick={handleSaveSettings} disabled={isSavingSettings} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50">
              {isSavingSettings ? "Saugoma..." : "Išsaugoti"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold mb-4">Pridėti puslapį</h2>
              <form onSubmit={handleAddPage} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Puslapio URL</label>
                  <input
                    type="url" required placeholder="https://facebook.com/..."
                    className="w-full rounded-lg border-gray-300 border p-2.5 text-sm outline-none"
                    value={url} onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pavadinimas</label>
                  <input
                    type="text" placeholder="Pavadinimas"
                    className="w-full rounded-lg border-gray-300 border p-2.5 text-sm outline-none"
                    value={name} onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleTestScrape}
                    disabled={isTestingScrape || !url}
                    className="flex-1 bg-gray-600 text-white rounded-lg py-2.5 text-sm font-bold disabled:opacity-50"
                  >
                    {isTestingScrape ? "Testuojama..." : "Testuoti"}
                  </button>
                  <button type="submit" disabled={isAdding} className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-bold disabled:opacity-50">
                    {isAdding ? "Pridedama..." : "Pridėti"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold mb-4">Stebimi puslapiai</h2>
            {pages.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border border-dashed text-gray-500 text-center">Dar nėra sekamų puslapių.</div>
            ) : (
              <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left font-bold text-gray-500">Puslapis</th>
                      <th className="px-6 py-3 text-left font-bold text-gray-500">Statusas</th>
                      <th className="px-6 py-3 text-right font-bold text-gray-500">Veiksmai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pages.map((page) => (
                      <tr key={page.id}>
                        <td className="px-6 py-4">
                          <div className="font-bold">{page.name || "Nėra pavadinimo"}</div>
                          <div className="text-xs text-blue-600">{page.url}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${page.status ==='active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {page.status === 'active' ? 'Aktyvus' : 'Klaida'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-3">
                          <button onClick={() => handleTestPage(page.id)} disabled={!!testStatus[page.id]} className="text-blue-600 font-bold">{testStatus[page.id] || "Test"}</button>
                          <button onClick={() => handleDelete(page.id)} className="text-red-600 font-bold">Šalinti</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Scrape Results Modal */}
        {showScrapeModal && scrapeResults && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                <h3 className="text-lg font-bold">Paskutiniai įrašai ({scrapeResults.length})</h3>
                <button onClick={() => setShowScrapeModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              </div>
              <div className="p-4 space-y-4">
                {scrapeResults.map((post, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      {post.imageUrl && (
                        <img src={post.imageUrl} alt="" className="w-20 h-20 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 mb-2">{post.text}</p>
                        {post.postUrl && (
                          <a href={post.postUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                            Peržiūrėti originalą →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
                <button
                  onClick={() => setShowScrapeModal(false)}
                  className="w-full bg-green-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-green-700"
                >
                  Gerai, pridėti šį puslapį
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
