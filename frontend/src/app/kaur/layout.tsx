"use client";

import AppShell from "@/components/layout/AppShell";
import KaurSidebar from "@/components/sidebar/KaurSidebar";
import PageTransition from "@/components/PageTransition";

export default function KaurLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell sidebar={<KaurSidebar />}>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
