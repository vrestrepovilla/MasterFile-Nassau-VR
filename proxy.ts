import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export function proxy(...args: Parameters<typeof auth>) {
  return auth(...args);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|webp|svg|jpg|jpeg|ico)).*)"],
};
