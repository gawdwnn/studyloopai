import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client";
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
    <DashboardLayoutClient defaultSidebarOpen={defaultState}>
      {children}
    </DashboardLayoutClient>
  );
}
