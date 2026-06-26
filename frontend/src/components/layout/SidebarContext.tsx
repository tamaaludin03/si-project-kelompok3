"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * State chrome (sidebar collapse / mobile drawer) yang dibagikan antara
 * Navbar (tombol hamburger) dan SidebarShell. Sebelumnya state ini internal
 * di SidebarShell; dipindah ke context supaya Navbar bisa men-toggle sidebar.
 */
type SidebarContextValue = {
  /** viewport < 1024px */
  isMobile: boolean;
  /** desktop: sidebar terbentang (true) atau menyempit (false) */
  isExpanded: boolean;
  /** mobile: drawer terbuka */
  mobileOpen: boolean;
  /** label/brand ditampilkan? (desktop expanded ATAU drawer mobile terbuka) */
  effectiveExpanded: boolean;
  mounted: boolean;
  /** tombol hamburger: collapse di desktop, buka/tutup drawer di mobile */
  toggle: () => void;
  closeMobile: () => void;
  /** dipanggil saat item nav diklik (tutup drawer di mobile) */
  onNavClick?: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar harus dipakai di dalam <SidebarProvider>");
  return ctx;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [isExpanded, setIsExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const saved = localStorage.getItem("sidebar_expanded");
    if (saved !== null) setIsExpanded(saved === "true");

    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile, { passive: true });
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Tutup drawer saat pindah halaman
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Reset drawer saat kembali ke desktop
  useEffect(() => { if (!isMobile) setMobileOpen(false); }, [isMobile]);

  // Persist state desktop + update CSS var untuk spacer layout
  useEffect(() => {
    if (!mounted) return;
    if (!isMobile) {
      localStorage.setItem("sidebar_expanded", String(isExpanded));
      document.documentElement.style.setProperty(
        "--sidebar-w",
        isExpanded ? "15rem" : "3.5rem",
      );
    } else {
      document.documentElement.style.setProperty("--sidebar-w", "3.5rem");
    }
  }, [isExpanded, isMobile, mounted]);

  // Kunci scroll body saat drawer mobile terbuka
  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = isMobile && mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, mobileOpen, mounted]);

  const effectiveExpanded = isMobile ? mobileOpen : isExpanded;

  const toggle = () => {
    if (isMobile) setMobileOpen((v) => !v);
    else setIsExpanded((v) => !v);
  };

  const value: SidebarContextValue = {
    isMobile,
    isExpanded,
    mobileOpen,
    effectiveExpanded,
    mounted,
    toggle,
    closeMobile: () => setMobileOpen(false),
    onNavClick: isMobile ? () => setMobileOpen(false) : undefined,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}
