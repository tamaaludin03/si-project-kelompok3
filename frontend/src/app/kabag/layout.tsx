"use client";

import AppShell from "@/components/layout/AppShell";
import KabagSidebar from "@/components/sidebar/KabagSidebar";
import PageTransition from "@/components/PageTransition";

export default function KabagLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell sidebar={<KabagSidebar />}>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
