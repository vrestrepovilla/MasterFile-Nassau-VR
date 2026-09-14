"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calculator,
  ClipboardList,
  Container,
  DollarSign,
  FileText,
  FolderKanban,
  HelpCircle,
  Landmark,
  LayoutDashboard,
  Receipt,
  Settings,
  Ship,
  ShoppingCart,
  Users,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { ROLE_LABELS } from "@/lib/constants";

const LOGISTICS_NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/containers", label: "Contenedores", icon: Container },
  { href: "/invoices", label: "Facturas", icon: FileText },
  { href: "/rates", label: "Tarifas de Flete", icon: Ship },
  { href: "/broker-calculator", label: "Calculadora de Broker", icon: Calculator },
];

const LOGISTICS_ADMIN_NAV = [{ href: "/projects", label: "Proyectos", icon: FolderKanban }];

const PURCHASING_NAV = [
  { href: "/compras", label: "Dashboard", icon: LayoutDashboard },
  { href: "/compras/purchases", label: "Compras", icon: ShoppingCart },
  { href: "/compras/pos", label: "P.O.'s", icon: ClipboardList },
  { href: "/compras/comm-invoices", label: "Commercial Invoices", icon: Receipt },
  { href: "/compras/invoices", label: "Facturas", icon: FileText },
  { href: "/compras/precios", label: "Base de Precios USA", icon: DollarSign },
  { href: "/compras/nassau", label: "Compras Nassau", icon: Landmark },
];

// These roots must match exactly — otherwise "/compras" would also light up
// while viewing "/compras/purchases/123", since it's a startsWith prefix of it.
const EXACT_MATCH_ROOTS = new Set(["/", "/compras"]);

const ADMIN_NAV = [{ href: "/users", label: "Usuarios", icon: Users }];

const FOOTER_NAV = [
  { href: "/settings", label: "Ajustes", icon: Settings },
  { href: "/help", label: "Ayuda", icon: HelpCircle },
];

function NavSection({
  title,
  readOnly,
  items,
  isActive,
}: {
  title?: string;
  readOnly?: boolean;
  items: { href: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[];
  isActive: (href: string) => boolean;
}) {
  return (
    <div className="space-y-0.5">
      {title && (
        <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/35 flex items-center gap-1.5">
          {title}
          {readOnly && (
            <span className="normal-case font-normal tracking-normal text-white/30">
              (solo lectura)
            </span>
          )}
        </p>
      )}
      {items.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-brand text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon className="size-4 shrink-0" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function Sidebar({
  role,
  department,
  readOnlyDepartment,
  userName,
}: {
  role: "admin" | "editor";
  department: "all" | "logistica" | "compras";
  readOnlyDepartment: "all" | "logistica" | "compras" | null;
  userName: string;
}) {
  const pathname = usePathname();
  const isAdmin = role === "admin";
  const showLogistics = isAdmin || department !== "compras" || readOnlyDepartment === "logistica";
  const showCompras = isAdmin || department !== "logistica" || readOnlyDepartment === "compras";
  const logisticsReadOnly = !isAdmin && department === "compras" && readOnlyDepartment === "logistica";
  const comprasReadOnly = !isAdmin && department === "logistica" && readOnlyDepartment === "compras";

  function isActive(href: string) {
    if (EXACT_MATCH_ROOTS.has(href)) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="w-60 shrink-0 h-full bg-ink text-white flex flex-col">
      <div className="p-5 border-b border-white/10">
        <Image src="/logo-white.png" alt="Cay Building" width={132} height={18} priority />
      </div>
      <nav className="flex-1 px-3 pb-3 space-y-1 overflow-y-auto">
        {showLogistics && (
          <NavSection
            title="Logística"
            readOnly={logisticsReadOnly}
            items={isAdmin ? [...LOGISTICS_NAV, ...LOGISTICS_ADMIN_NAV] : LOGISTICS_NAV}
            isActive={isActive}
          />
        )}
        {showCompras && (
          <NavSection
            title="Compras"
            readOnly={comprasReadOnly}
            items={PURCHASING_NAV}
            isActive={isActive}
          />
        )}
        {isAdmin && <NavSection title="Administración" items={ADMIN_NAV} isActive={isActive} />}
      </nav>
      <div className="p-3 border-t border-white/10 space-y-0.5">
        {FOOTER_NAV.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-brand text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="size-4 shrink-0" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="p-3 border-t border-white/10">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 mb-1 hover:bg-white/10 transition-colors"
        >
          <div className="size-7 rounded-full bg-white/10 grid place-items-center text-xs font-semibold shrink-0">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white truncate">{userName}</p>
            <p className="text-xs text-white/50">{ROLE_LABELS[role] ?? role}</p>
          </div>
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full text-left rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
