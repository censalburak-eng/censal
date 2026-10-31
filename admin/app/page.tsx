import { Suspense } from "react";
import type { AdminTab } from "@/components/app-sidebar";
import { AdminTabProvider } from "@/context/AdminTabContext";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse p-6">
      <div className="h-28 bg-muted/40 rounded-xl w-full" />
      <div className="h-64 bg-muted/30 rounded-xl w-full" />
    </div>
  );
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

async function DashboardContent({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab = (params?.tab as AdminTab) || "overview";

  return (
    <AdminTabProvider initialTab={activeTab}>
      <DashboardShell />
    </AdminTabProvider>
  );
}

export default function Page({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
