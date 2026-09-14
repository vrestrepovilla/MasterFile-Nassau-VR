import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: "admin" | "editor";
    department: "all" | "logistica" | "compras";
    readOnlyDepartment: "all" | "logistica" | "compras" | null;
  }

  interface Session {
    user: {
      id: string;
      role: "admin" | "editor";
      department: "all" | "logistica" | "compras";
      readOnlyDepartment: "all" | "logistica" | "compras" | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "editor";
    department?: "all" | "logistica" | "compras";
    readOnlyDepartment?: "all" | "logistica" | "compras" | null;
    id?: string;
  }
}
