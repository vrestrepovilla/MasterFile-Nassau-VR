import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

const LOGISTICS_EXACT_PATHS = new Set(["/"]);
const LOGISTICS_PREFIXES = ["/containers", "/invoices", "/rates", "/broker-calculator", "/projects"];
const COMPRAS_PREFIX = "/compras";

function isLogisticsPath(pathname: string) {
  return (
    LOGISTICS_EXACT_PATHS.has(pathname) ||
    LOGISTICS_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  );
}

function isComprasPath(pathname: string) {
  return pathname === COMPRAS_PREFIX || pathname.startsWith(`${COMPRAS_PREFIX}/`);
}

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/login")) return true;

      const isLoggedIn = !!auth?.user;
      if (!isLoggedIn) return false;

      const isAdminOnly = pathname.startsWith("/projects") || pathname.startsWith("/users");
      if (isAdminOnly) return auth?.user?.role === "admin";

      // Admins always see everything; a department scope only restricts
      // non-admin users to their own section (Logística vs Compras). A
      // readOnlyDepartment grants VIEW access to the other section too —
      // this callback only gates page navigation (GET), so it's enough to
      // let those requests through; the actual write actions enforce the
      // no-edit rule themselves (see lib/auth-helpers.ts).
      if (auth?.user?.role === "admin") return true;

      const department = auth?.user?.department ?? "all";
      const readOnlyDepartment = auth?.user?.readOnlyDepartment ?? null;

      if (
        department === "compras" &&
        readOnlyDepartment !== "logistica" &&
        isLogisticsPath(pathname)
      ) {
        return NextResponse.redirect(new URL("/compras", request.nextUrl));
      }
      if (
        department === "logistica" &&
        readOnlyDepartment !== "compras" &&
        isComprasPath(pathname)
      ) {
        return NextResponse.redirect(new URL("/", request.nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.department = user.department;
        token.readOnlyDepartment = user.readOnlyDepartment;
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as "admin" | "editor";
        session.user.department = (token.department as "all" | "logistica" | "compras") ?? "all";
        session.user.readOnlyDepartment =
          (token.readOnlyDepartment as "all" | "logistica" | "compras" | null | undefined) ?? null;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
