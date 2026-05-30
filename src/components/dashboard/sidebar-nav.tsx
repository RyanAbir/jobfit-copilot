"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/analyze", label: "Analyze Job" },
  { href: "/dashboard/applications", label: "Applications" },
];

function getIsActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard navigation" className="space-y-1.5">
      {navItems.map((item) => {
        const isActive = getIsActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-xl px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
