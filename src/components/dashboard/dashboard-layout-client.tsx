"use client";

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

interface DashboardLayoutClientProps {
	children: React.ReactNode;
	defaultSidebarOpen: boolean;
}

export function DashboardLayoutClient({
	children,
	defaultSidebarOpen,
}: DashboardLayoutClientProps) {
	return (
		<SidebarProvider defaultOpen={defaultSidebarOpen}>
			<SidebarStateManager />
			<div className="flex min-h-screen bg-background w-full">
				<AppSidebar />
				<SidebarInset className="relative flex-1 w-0 min-w-0 flex flex-col">
					<header className="sticky top-0 z-10 bg-background">
						<div className="flex h-14 items-center px-4">
							<div className="flex items-center gap-4">
								<SidebarTrigger />
								<AppBreadcrumbs />
							</div>
						</div>
					</header>
					<div className="p-4 md:p-6 w-full min-w-0 flex-1 flex flex-col">
						{children}
					</div>
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
