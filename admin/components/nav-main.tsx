"use client";

import Link from "next/link";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAdminTab } from "@/context/AdminTabContext";
import type { AdminTab } from "@/components/app-sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    tabKey: AdminTab;
    icon?: React.ReactNode;
    isActive?: boolean;
  }[];
}) {
  const { setActiveTab, preloadTab } = useAdminTab();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={item.isActive}
                onMouseEnter={() => preloadTab(item.tabKey)}
                onClick={(e) => {
                  // Normal sol tıkta Next.js RSC sunucu round-trip'i yerine anında istemci geçişi
                  if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                    e.preventDefault();
                    setActiveTab(item.tabKey);
                  }
                }}
                render={<Link href={item.url} prefetch={false} />}
                className={item.isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : ""}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
