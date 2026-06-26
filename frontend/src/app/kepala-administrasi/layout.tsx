"use client";

import AppShell from "@/components/layout/AppShell";
import KepalaAdministrasiSidebar from "@/components/sidebar/KepalaAdministrasiSidebar";
import PageTransition from "@/components/PageTransition";

export default function KepalaAdministrasiLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell sidebar={<KepalaAdministrasiSidebar />}>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
