import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        role={session.user.role}
        department={session.user.department}
        readOnlyDepartment={session.user.readOnlyDepartment}
        userName={session.user.name ?? session.user.email ?? ""}
      />
      <main className="flex-1 overflow-y-auto p-6 lg:p-10 max-w-[1400px]">{children}</main>
    </div>
  );
}
