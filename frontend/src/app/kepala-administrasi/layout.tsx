"use client";

import KepalaAdministrasiSidebar from "@/components/sidebar/KepalaAdministrasiSidebar";
import PageTransition from "@/components/PageTransition";

export default function KepalaAdministrasiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent">
      <KepalaAdministrasiSidebar />
      <div className="flex min-h-screen gap-5 p-4 pl-0">
        <aside className="hidden shrink-0 lg:block" style={{ width: "var(--sidebar-w, 3.5rem)", transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)" }} aria-hidden="true" />
        <main className="min-w-0 flex-1 overflow-hidden bg-transparent">
          <div className="mx-auto w-full max-w-[1500px] px-2 py-0">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
