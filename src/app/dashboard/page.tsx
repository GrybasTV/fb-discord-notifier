"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface MonitoredPage {
  id: string;
  url: string;
  name: string | null;
  status: string;
  last_checked: string | null;
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

  const fetchPages = async () => {
    setLoading(true);
    const res = await fetch("/api/pages");
    if (res.ok) {
      const data = await res.json();
      setPages(data);
    }
    setLoading(false);
  };

  const fetchSettings = async () => {
    const res = await fetch("/api/user/settings");
    if (res.ok) {
      const data = await res.json();
      setGlobalWebhook(data.default_discord_webhook_url || "");
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchPages();
      fetchSettings();
    }
  }, [status, router]);

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
                <button type="submit" disabled={isAdding} className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-bold disabled:opacity-50">
                  {isAdding ? "Pridedama..." : "Pridėti sekimą"}
                </button>
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
      </main>
    </div>
  );
}
