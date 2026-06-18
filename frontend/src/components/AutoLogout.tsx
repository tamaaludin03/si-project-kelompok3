"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const IDLE_TIMEOUT = 10 * 1000;
const WARNING_TIMEOUT = 30 * 1000;

export default function AutoLogout() {
  const router = useRouter();
  const pathname = usePathname();

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningShown = useRef(false);

  const isLoginPage = pathname === "/login";

  const clearClientAuth = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    sessionStorage.clear();
  };

  const forceLogin = () => {
    clearClientAuth();
    router.replace("/login");
    router.refresh();
  };

  const checkAuth = () => {
    const token = localStorage.getItem("token");

    if (!token && !isLoginPage) {
      router.replace("/login");
      router.refresh();
      return false;
    }

    return true;
  };

  const clearAuthData = async () => {
    try {
      const token = localStorage.getItem("token");

      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      forceLogin();
    }
  };

  const resetTimers = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);

    warningShown.current = false;

    idleTimer.current = setTimeout(() => {
      if (!warningShown.current) {
        warningShown.current = true;

        const stayLoggedIn = window.confirm(
          "Anda akan logout otomatis dalam 30 detik karena tidak ada aktivitas. Klik OK untuk tetap aktif."
        );

        if (stayLoggedIn) {
          resetTimers();
          return;
        }
      }

      warningTimer.current = setTimeout(() => {
        clearAuthData();
      }, WARNING_TIMEOUT);
    }, IDLE_TIMEOUT);
  };

  useEffect(() => {
    if (isLoginPage) return;

    if (!checkAuth()) return;

    const events = [
      "mousemove",
      "mousedown",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    const handleActivity = () => {
      if (checkAuth()) resetTimers();
    };

    const handlePageShow = () => {
      checkAuth();
    };

    const handlePopState = () => {
      checkAuth();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAuth();
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    resetTimers();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });

      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warningTimer.current) clearTimeout(warningTimer.current);
    };
  }, [pathname]);

  return null;
}