import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

// Same rule as requireDepartmentWrite below, but as a plain boolean check for
// pages that need to decide what to render (show/hide a "+ Nueva" button,
// switch a form to read-only) rather than block a mutation outright.
export function canWriteArea(
  session: Session | null,
  area: "logistica" | "compras",
): boolean {
  if (!session?.user) return false;
  if (session.user.role === "admin") return true;
  return session.user.department === "all" || session.user.department === area;
}

// Enforces the actual no-edit rule for a department-scoped read-only user
// (e.g. Luis Eduardo can view Compras but never modify it). Middleware only
// gates page navigation, so every mutating server action for a given area
// must call this instead of a bare auth() check.
export async function requireDepartmentWrite(area: "logistica" | "compras") {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "admin") return session;

  const { department } = session.user;
  if (department === "all" || department === area) return session;

  // They're logged in but this area is (at most) read-only for them —
  // bounce to whichever section they can actually edit.
  redirect(department === "compras" ? "/compras" : "/");
}
