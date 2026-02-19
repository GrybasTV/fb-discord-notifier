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
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchPages();
    }
  }, [status, router]);

  const fetchPages = async () => {
    setLoading(true);
    const res = await fetch("/api/pages");
    if (res.ok) {
      const data = await res.json();
      setPages(data);
    }
    setLoading(false);
  };

  const handleAddPage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, name, discord_webhook_url: discordWebhook }),
    });

    if (res.ok) {
      setUrl("");
      setName("");
      setDiscordWebhook("");
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

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 font-sans">
        <div className="text-lg font-medium text-gray-600 animate-pulse">Kraunama...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              FB Notifier Dashboard
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 hidden sm:inline">{session?.user?.email}</span>
              <button
                onClick={() => signOut()}
                className="text-sm font-semibold text-red-600 hover:text-red-500 transition-colors"
              >
                Atsijungti
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Page Form */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </span>
                Pridėti puslapį
              </h2>
              <form onSubmit={handleAddPage} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Puslapio URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://facebook.com/puslapis"
                    className="w-full rounded-lg border-gray-300 border p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Pavadinimas (nebūtina)
                  </label>
                  <input
                    type="text"
                    placeholder="Mano mėgstamas puslapis"
                    className="w-full rounded-lg border-gray-300 border p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Discord Webhook (tik šiam puslapiui)
                  </label>
                  <input
                    type="url"
                    placeholder="Palikti tuščią, jei naudojate globalų"
                    className="w-full rounded-lg border-gray-300 border p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    value={discordWebhook}
                    onChange={(e) => setDiscordWebhook(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {isAdding ? "Pridedama..." : "Pridėti sekimą"}
                </button>
              </form>
            </div>
          </div>

          {/* Pages List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
              </span>
              Stebimi puslapiai ({pages.length})
            </h2>

            {pages.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 shadow-sm">
                <p>Kol kas neturite jokių sekamų puslapių.</p>
                <p className="text-sm">Pridėkite pirmąjį kairėje pusėje esančioje formoje.</p>
              </div>
            ) : (
              <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Puslapis</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Statusas</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tikrinta</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Veiksmai</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pages.map((page) => (
                      <tr key={page.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900">{page.name || "Nėra pavadinimo"}</div>
                          <div className="text-xs text-blue-600 truncate max-w-xs hover:underline cursor-pointer">
                            <a href={page.url} target="_blank" rel="noopener noreferrer">{page.url}</a>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            page.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {page.status === "active" ? "Aktyvus" : "Klaida"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {page.last_checked ? new Date(page.last_checked).toLocaleString('lt-LT') : "Dar netikrintas"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(page.id)}
                            className="text-red-600 hover:text-red-900 font-bold text-xs"
                          >
                            Šalinti
                          </button>
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
