"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/feedback", label: "Feedback" },
  { href: "/dashboard/changelog", label: "Changelog" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function SidebarNav() {
  const pathname = usePathname();
  return (
    <>
      {navItems.map(({ href, label }) => {
        const active =
          href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm px-3 py-2 rounded-lg transition-colors ${
              active
                ? "bg-indigo-50 text-indigo-700 font-medium"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
