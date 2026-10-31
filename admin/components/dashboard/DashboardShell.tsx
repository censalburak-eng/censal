"use client";

import dynamic from "next/dynamic";
import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAdminTab } from "@/context/AdminTabContext";

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-28 bg-muted/40 rounded-xl w-full" />
      <div className="h-64 bg-muted/30 rounded-xl w-full" />
    </div>
  );
}

// Sekmeler ilk ihtiyaç duyulduğunda dinamik olarak yüklenir
const OverviewTab = dynamic(
  () => import("@/components/dashboard/OverviewTab").then((mod) => mod.OverviewTab),
  { loading: () => <TabSkeleton /> }
);
const SettingsTab = dynamic(
  () => import("@/components/dashboard/SettingsTab").then((mod) => mod.SettingsTab),
  { loading: () => <TabSkeleton /> }
);
const PriceManagementTab = dynamic(
  () => import("@/components/dashboard/PriceManagementTab").then((mod) => mod.PriceManagementTab),
  { loading: () => <TabSkeleton /> }
);
const CityQuotasTab = dynamic(
  () => import("@/components/dashboard/CityQuotasTab").then((mod) => mod.CityQuotasTab),
  { loading: () => <TabSkeleton /> }
);
const UsersTab = dynamic(
  () => import("@/components/dashboard/UsersTab").then((mod) => mod.UsersTab),
  { loading: () => <TabSkeleton /> }
);
const PaymentsTab = dynamic(
  () => import("@/components/dashboard/PaymentsTab").then((mod) => mod.PaymentsTab),
  { loading: () => <TabSkeleton /> }
);
const ModerationTab = dynamic(
  () => import("@/components/dashboard/ModerationTab").then((mod) => mod.ModerationTab),
  { loading: () => <TabSkeleton /> }
);
const LogsTab = dynamic(
  () => import("@/components/dashboard/LogsTab").then((mod) => mod.LogsTab),
  { loading: () => <TabSkeleton /> }
);

export function DashboardShell() {
  const { activeTab, visitedTabs } = useAdminTab();

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader activeTab={activeTab} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 p-4 md:p-6 pb-20 max-w-7xl w-full mx-auto">
              {/* Keep-Alive Pattern: Ziyaret edilen sekmeler hafızada korunur, geçiş 0ms'dir */}
              {visitedTabs.has("overview") && (
                <div className={activeTab === "overview" ? "block" : "hidden"}>
                  <OverviewTab />
                </div>
              )}
              {visitedTabs.has("settings") && (
                <div className={activeTab === "settings" ? "block" : "hidden"}>
                  <SettingsTab />
                </div>
              )}
              {visitedTabs.has("pricing") && (
                <div className={activeTab === "pricing" ? "block" : "hidden"}>
                  <PriceManagementTab />
                </div>
              )}
              {visitedTabs.has("quotas") && (
                <div className={activeTab === "quotas" ? "block" : "hidden"}>
                  <CityQuotasTab />
                </div>
              )}
              {visitedTabs.has("users") && (
                <div className={activeTab === "users" ? "block" : "hidden"}>
                  <UsersTab />
                </div>
              )}
              {visitedTabs.has("payments") && (
                <div className={activeTab === "payments" ? "block" : "hidden"}>
                  <PaymentsTab />
                </div>
              )}
              {visitedTabs.has("moderation") && (
                <div className={activeTab === "moderation" ? "block" : "hidden"}>
                  <ModerationTab />
                </div>
              )}
              {visitedTabs.has("logs") && (
                <div className={activeTab === "logs" ? "block" : "hidden"}>
                  <LogsTab />
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
