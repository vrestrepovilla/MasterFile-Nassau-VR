"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/nassau/dashboard", label: "Dashboard" },
  { href: "/nassau/master-file", label: "Master File" },
  { href: "/nassau/invoices", label: "Invoices" },
  { href: "/nassau/outstanding-invoices", label: "Cuentas por Pagar" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-cay-black">
      <div className="border-b border-white/10 px-5 py-6">
        <Image src="/cay-logo.png" alt="Cay Building" width={130} height={26} priority />
        <span className="mt-1 block text-[10px] uppercase tracking-widest text-white/50">
          Supply Chain
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-md px-3 py-2 text-sm transition ${
                active
                  ? "bg-cay-red text-white font-medium"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
