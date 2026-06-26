"use client";

import AppShell from "@/components/layout/AppShell";
import SdmSidebar from "@/components/sidebar/SdmSidebar";
import PageTransition from "@/components/PageTransition";

export default function SdmLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell sidebar={<SdmSidebar />}>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
