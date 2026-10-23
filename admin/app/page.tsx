import dynamic from "next/dynamic";
import { Suspense } from "react";
import { AppSidebar, type AdminTab } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

// Tab skeleton placeholder
function TabSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-28 bg-muted/40 rounded-xl w-full" />
      <div className="h-64 bg-muted/30 rounded-xl w-full" />
    </div>
  );
}

// Dynamic Imports with Suspense per PERFORMANCE_ADMIN.md (Section 5.2)
const OverviewTab = dynamic(() => import("@/components/dashboard/OverviewTab").then((mod) => mod.OverviewTab), {
  loading: () => <TabSkeleton />,
});
const SettingsTab = dynamic(() => import("@/components/dashboard/SettingsTab").then((mod) => mod.SettingsTab), {
  loading: () => <TabSkeleton />,
});
const CityQuotasTab = dynamic(() => import("@/components/dashboard/CityQuotasTab").then((mod) => mod.CityQuotasTab), {
  loading: () => <TabSkeleton />,
});
const UsersTab = dynamic(() => import("@/components/dashboard/UsersTab").then((mod) => mod.UsersTab), {
  loading: () => <TabSkeleton />,
});
const PaymentsTab = dynamic(() => import("@/components/dashboard/PaymentsTab").then((mod) => mod.PaymentsTab), {
  loading: () => <TabSkeleton />,
});
const ModerationTab = dynamic(() => import("@/components/dashboard/ModerationTab").then((mod) => mod.ModerationTab), {
  loading: () => <TabSkeleton />,
});
const LogsTab = dynamic(() => import("@/components/dashboard/LogsTab").then((mod) => mod.LogsTab), {
  loading: () => <TabSkeleton />,
});

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

async function DashboardContent({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab = (params?.tab as AdminTab) || "overview";

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" activeTab={activeTab} />
      <SidebarInset>
        <SiteHeader activeTab={activeTab} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 p-4 md:p-6 pb-20 max-w-7xl w-full mx-auto">
              {activeTab === "overview" && <OverviewTab />}
              {activeTab === "settings" && <SettingsTab />}
              {activeTab === "quotas" && <CityQuotasTab />}
              {activeTab === "users" && <UsersTab />}
              {activeTab === "payments" && <PaymentsTab />}
              {activeTab === "moderation" && <ModerationTab />}
              {activeTab === "logs" && <LogsTab />}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function Page({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
