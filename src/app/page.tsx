import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="max-w-2xl space-y-8">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
          FB to Discord <span className="text-blue-600">Notifier</span>
        </h1>
        <p className="mt-6 text-xl text-gray-600">
          Automatiškai stebėkite savo mėgstamus Facebook puslapius ir gaukite
          pranešimus tiesiai į savo Discord kanalą.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/dashboard"
            className="rounded-full bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-blue-500 hover:shadow-lg active:scale-95"
          >
            Eiti į Valdymo Panelę
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-gray-300 bg-white px-8 py-4 text-lg font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:shadow-md active:scale-95"
          >
            Prisijungti
          </Link>
        </div>
      </div>

      <footer className="absolute bottom-8 text-sm text-gray-400">
        &copy; {new Date().getFullYear()} FB Notifier. Visos teisės saugomos.
      </footer>
    </div>
  );
}
