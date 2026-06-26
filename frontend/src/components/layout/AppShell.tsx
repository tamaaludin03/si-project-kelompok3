"use client";

import React from "react";
import { SidebarProvider } from "./SidebarContext";
import Navbar from "./Navbar";

/**
 * Kerangka aplikasi: Navbar sticky (full width) + sidebar (drawer di mobile)
 * + area konten dengan gutter konsisten ~24px di semua sisi.
 * Dipakai di seluruh layout per-role agar chrome konsisten & satu sumber.
 */
export default function AppShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      {/* Sidebar fixed (top-14, di bawah navbar) — dirender di luar alur flex */}
      {sidebar}

      <div className="flex min-h-screen flex-col bg-transparent">
        <Navbar />

        {/* pl-0 di desktop: spacer menyamai lebar sidebar; gap-6 = gutter kiri 24px */}
        <div className="flex flex-1 gap-6 p-4 lg:p-6 lg:pl-0">
          {/* Spacer mengikuti lebar sidebar (lewat --sidebar-w), hanya desktop */}
          <aside
            className="hidden shrink-0 lg:block"
            style={{ width: "var(--sidebar-w, 3.5rem)", transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)" }}
            aria-hidden="true"
          />

          <main className="min-w-0 flex-1 bg-transparent">
            <div className="w-full">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
