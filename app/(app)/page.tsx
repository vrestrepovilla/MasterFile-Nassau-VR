import { auth } from "@/lib/auth";
import { getContainers } from "@/lib/data/containers";
import { getAllBrokerInvoices } from "@/lib/data/broker-invoices";
import { getProjects } from "@/lib/data/projects";
import { getUsersLite } from "@/lib/data/users";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const [containers, invoices, projects, usersLite, session] = await Promise.all([
    getContainers(),
    getAllBrokerInvoices(),
    getProjects(),
    getUsersLite(),
    auth(),
  ]);

  return (
    <DashboardClient
      containers={containers}
      invoices={invoices}
      projects={projects}
      usersById={usersLite.map((u) => [u.id, u.name] as [number, string])}
      userName={session?.user.name ?? session?.user.email ?? "Usuario"}
    />
  );
}
