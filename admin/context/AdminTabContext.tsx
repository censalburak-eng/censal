"use client";

import * as React from "react";
import type { AdminTab } from "@/components/app-sidebar";

// Sekmelerin JS chunk'larını arka planda yükleyen fonksiyonlar
export const tabLoaders: Record<AdminTab, () => Promise<unknown>> = {
  overview: () => import("@/components/dashboard/OverviewTab"),
  settings: () => import("@/components/dashboard/SettingsTab"),
  pricing: () => import("@/components/dashboard/PriceManagementTab"),
  quotas: () => import("@/components/dashboard/CityQuotasTab"),
  users: () => import("@/components/dashboard/UsersTab"),
  payments: () => import("@/components/dashboard/PaymentsTab"),
  moderation: () => import("@/components/dashboard/ModerationTab"),
  logs: () => import("@/components/dashboard/LogsTab"),
};

interface AdminTabContextType {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  preloadTab: (tab: AdminTab) => void;
  visitedTabs: Set<AdminTab>;
}

const AdminTabContext = React.createContext<AdminTabContextType | null>(null);

export function AdminTabProvider({
  children,
  initialTab = "overview",
}: {
  children: React.ReactNode;
  initialTab?: AdminTab;
}) {
  const [activeTab, setActiveTabState] = React.useState<AdminTab>(initialTab);
  const [visitedTabs, setVisitedTabs] = React.useState<Set<AdminTab>>(
    () => new Set([initialTab])
  );

  const preloadedRef = React.useRef<Set<AdminTab>>(new Set([initialTab]));

  // Sekmeyi arka planda (hover veya boşta iken) önceden indir
  const preloadTab = React.useCallback((tab: AdminTab) => {
    if (!preloadedRef.current.has(tab)) {
      preloadedRef.current.add(tab);
      tabLoaders[tab]?.().catch(() => {});
    }
  }, []);

  // Sekme değiştirme (0ms gecikme ile istemci tarafında anında geçiş)
  const setActiveTab = React.useCallback(
    (tab: AdminTab) => {
      setActiveTabState(tab);
      setVisitedTabs((prev) => {
        if (prev.has(tab)) return prev;
        const next = new Set(prev);
        next.add(tab);
        return next;
      });

      // URL'yi sunucuya RSC isteği atmadan (shallow) sessizce güncelle
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.get("tab") !== tab) {
          url.searchParams.set("tab", tab);
          window.history.replaceState({ tab }, "", url.toString());
        }
      }
    },
    []
  );

  // Tarayıcının Geri / İleri butonlarını dinle
  React.useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const tab = (params.get("tab") as AdminTab) || "overview";
        if (tabLoaders[tab]) {
          setActiveTabState(tab);
          setVisitedTabs((prev) => {
            if (prev.has(tab)) return prev;
            const next = new Set(prev);
            next.add(tab);
            return next;
          });
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Sayfa açıldıktan hemen sonra tarayıcı boşta (idle) iken diğer sekmeleri arka planda ön-yükle
  React.useEffect(() => {
    const idleCallback =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? (window as any).requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 1000);

    const handle = idleCallback(() => {
      const allTabs: AdminTab[] = [
        "overview",
        "settings",
        "pricing",
        "quotas",
        "users",
        "payments",
        "moderation",
        "logs",
      ];
      allTabs.forEach((tab) => {
        preloadTab(tab);
      });
    });

    return () => {
      if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
        (window as any).cancelIdleCallback(handle);
      }
    };
  }, [preloadTab]);

  return (
    <AdminTabContext.Provider
      value={{
        activeTab,
        setActiveTab,
        preloadTab,
        visitedTabs,
      }}
    >
      {children}
    </AdminTabContext.Provider>
  );
}

export function useAdminTab() {
  const context = React.useContext(AdminTabContext);
  if (!context) {
    throw new Error("useAdminTab must be used within an AdminTabProvider");
  }
  return context;
}
