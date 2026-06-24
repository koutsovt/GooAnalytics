"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";

interface NavLinkProps {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function NavLink({ href, label, icon: Icon }: NavLinkProps) {
  const pathname = usePathname();
  const isActive =
    pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-brand text-white shadow-sm"
          : "text-foreground hover:bg-muted hover:text-brand"
      }`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
      <span>{label}</span>
    </Link>
  );
}
