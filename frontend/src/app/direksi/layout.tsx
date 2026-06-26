"use client";

import AppShell from "@/components/layout/AppShell";
import DireksiSidebar from "@/components/sidebar/DireksiSidebar";
import PageTransition from "@/components/PageTransition";

export default function DireksiLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell sidebar={<DireksiSidebar />}>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
