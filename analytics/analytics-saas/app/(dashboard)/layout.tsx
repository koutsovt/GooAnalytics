"use client";

import { BarChart3, Building2, CreditCard, FileText, Menu, Settings, Users, X } from "lucide-react";
import { useState } from "react";
import { NavLink } from "@/components/dashboard/nav-link";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: BarChart3 },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Properties", href: "/properties", icon: Building2 },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Team", href: "/settings/team", icon: Users },
  { label: "Billing", href: "/settings/billing", icon: CreditCard },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile hamburger button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-40 md:hidden p-2 rounded-md hover:bg-muted"
        aria-label="Toggle menu"
      >
        {sidebarOpen ? (
          <X className="h-6 w-6 text-foreground" strokeWidth={1.5} />
        ) : (
          <Menu className="h-6 w-6 text-foreground" strokeWidth={1.5} />
        )}
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 w-64 border-r border-border bg-card p-6 z-30 transform transition-transform md:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{ minHeight: "100vh" }}
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-brand">AnalyticsIQ</h1>
          <p className="text-xs text-muted-foreground mt-1">Analytics Dashboard</p>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <div key={item.href} onClick={() => setSidebarOpen(false)}>
              <NavLink {...item} />
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 w-full md:w-auto p-4 md:p-8 pt-16 md:pt-8">{children}</main>
    </div>
  );
}
