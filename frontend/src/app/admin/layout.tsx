"use client";

import AppShell from "@/components/layout/AppShell";
import AdminSidebar from "@/components/sidebar/AdminSidebar";
import PageTransition from "@/components/PageTransition";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell sidebar={<AdminSidebar />}>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
