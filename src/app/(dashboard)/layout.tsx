import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { CommandPaletteTrigger } from "@/components/command-palette-trigger";
import { FloatingChat } from "@/components/floating-chat";
import { SidebarStateManager } from "@/components/sidebar-state-manager";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cookies } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("sidebar-state");
  let defaultState = true;
  if (sidebarState) {
    defaultState = sidebarState.value === "true";
  }


  return (
    <SidebarProvider defaultOpen={defaultState}>
      <SidebarStateManager />
        <div className="flex min-h-screen bg-background">
          <AppSidebar />
          <SidebarInset className="relative">
            <header className="sticky top-0 z-10 border-b bg-background">
              <div className="flex h-14 items-center px-4">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <AppBreadcrumbs />
                </div>
              </div>
            </header>
            <div className="container mx-auto p-6">{children}</div>
            <div className="fixed right-4 top-4 z-50">
              <CommandPaletteTrigger />
            </div>
          </SidebarInset>
        </div>
        <CommandPalette />
        <FloatingChat />
      <SidebarStateManager />
    </SidebarProvider>
  );
}
