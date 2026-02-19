export { default } from "next-auth/middleware";

export const config = {
  // Apsaugome visus puslapius, kurie prasideda /dashboard arba /api (išskyrus auth ir kitas viešas)
  matcher: [
    "/dashboard/:path*",
    "/api/pages/:path*",
  ],
};
