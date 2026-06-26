"use client";

import AppShell from "@/components/layout/AppShell";
import DirekturAdministrasiSidebar from "@/components/sidebar/DirekturAdministrasiSidebar";
import PageTransition from "@/components/PageTransition";

export default function DirekturLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell sidebar={<DirekturAdministrasiSidebar />}>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
