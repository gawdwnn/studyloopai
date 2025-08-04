"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { useCurrentUserImage } from "@/hooks/use-current-user-image";
import { useCurrentUserName } from "@/hooks/use-current-user-name";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import {
	BookOpen,
	Brain,
	BrainCog,
	CheckCircle,
	ChevronDown,
	Clipboard,
	FileText,
	Home,
	LogOut,
	MessageSquare,
	Settings,
	User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface RouteItem {
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	href: string;
	subItems?: Array<{
		label: string;
		href: string;
		icon: React.ComponentType<{ className?: string }>;
	}>;
	onClick?: (e: React.MouseEvent) => void;
}

const routes: RouteItem[] = [
	{
		label: "Overview",
		icon: Home,
		href: "/dashboard",
	},
	{
		label: "Course Materials",
		icon: BookOpen,
		href: "/dashboard/course-materials",
	},
	{
		label: "Notes",
		href: "/dashboard/notes",
		icon: FileText,
	},
	{
		label: "Adaptive Learning",
		icon: Brain,
		href: "/dashboard/adaptive-learning",
		subItems: [
			{
				label: "Multiple Choice",
				href: "/dashboard/adaptive-learning/multiple-choice",
				icon: CheckCircle,
			},
			{
				label: "Cue Cards",
				href: "/dashboard/adaptive-learning/cuecards",
				icon: Clipboard,
			},
			// not supported yet
			// {
			// 	label: "Open Questions",
			// 	href: "/dashboard/adaptive-learning/open-questions",
			// 	icon: QuestionMarkIcon,
			// },
			// {
			// 	label: "Concept Maps",
			// 	href: "/dashboard/adaptive-learning/concept-maps",
			// 	icon: Route,
			// },
		],
	},
	{
		label: "Feedback",
		icon: MessageSquare,
		href: "/dashboard/feedback",
	},
	{
		label: "Ask AI",
		icon: BrainCog,
		href: "/dashboard/ask-ai",
	},
];

const bottomRoutes: RouteItem[] = [
	{
		label: "Settings",
		icon: Settings,
		href: "/dashboard/settings",
	},
	{
		label: "Account",
		icon: User,
		href: "/dashboard/account",
	},
	{
		label: "Sign Out",
		icon: LogOut,
		href: "#",
	},
];

export function AppSidebar() {
	const router = useRouter();
	const pathname = usePathname();
	const [openItems, setOpenItems] = useState<string[]>([]);
	const { setOpenMobile } = useSidebar();
	const userImage = useCurrentUserImage();
	const userName = useCurrentUserName();

	const closeMobileSidebar = () => {
		if (window.innerWidth < 768) {
			setOpenMobile(false);
		}
	};

	const toggleItem = (href: string) => {
		setOpenItems((prev) =>
			prev.includes(href)
				? prev.filter((item) => item !== href)
				: [...prev, href]
		);
	};

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" className="w-full">
							<Avatar className="h-8 w-8">
								<AvatarImage
									src={userImage || undefined}
									alt={userName || "User"}
								/>
								<AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
									{userName ? userName.charAt(0).toUpperCase() : "U"}
								</AvatarFallback>
							</Avatar>
							<div className="flex flex-col gap-0.5 text-left group-data-[collapsible=icon]:hidden">
								<span className="text-sm font-semibold">
									{userName || "StudyLoopAI"}
								</span>
								<span className="text-xs text-muted-foreground">
									Personal Workspace
								</span>
							</div>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
						Study Tools
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{routes.map((route) => {
								const isActive = pathname === route.href;
								const isOpen = openItems.includes(route.href);

								return (
									<SidebarMenuItem key={route.href}>
										{route.subItems ? (
											<Collapsible
												open={isOpen}
												onOpenChange={() => toggleItem(route.href)}
											>
												<CollapsibleTrigger asChild>
													<SidebarMenuButton
														asChild
														className={cn(
															"w-full",
															isActive &&
																"bg-sidebar-accent text-sidebar-accent-foreground"
														)}
														tooltip={route.label}
													>
														{route.onClick ? (
															<button
																type="button"
																onClick={(e) => {
																	closeMobileSidebar();
																	route.onClick?.(e);
																}}
																className="flex w-full items-center gap-2 text-left"
															>
																<route.icon className="h-4 w-4" />
																<span className="group-data-[collapsible=icon]:hidden">
																	{route.label}
																</span>
																<ChevronDown
																	className={cn(
																		"ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden",
																		isOpen && "rotate-180"
																	)}
																/>
															</button>
														) : (
															<Link
																href={route.href}
																className="flex items-center gap-2"
																onClick={closeMobileSidebar}
															>
																<route.icon className="h-4 w-4" />
																<span className="group-data-[collapsible=icon]:hidden">
																	{route.label}
																</span>
																<ChevronDown
																	className={cn(
																		"ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden",
																		isOpen && "rotate-180"
																	)}
																/>
															</Link>
														)}
													</SidebarMenuButton>
												</CollapsibleTrigger>
												<CollapsibleContent>
													<SidebarMenuSub>
														{route.subItems.map((subItem) => {
															const isSubActive = pathname === subItem.href;
															return (
																<SidebarMenuSubItem key={subItem.href}>
																	<SidebarMenuSubButton
																		asChild
																		className={cn(
																			isSubActive &&
																				"bg-sidebar-accent text-sidebar-accent-foreground"
																		)}
																	>
																		<Link
																			href={subItem.href}
																			onClick={closeMobileSidebar}
																		>
																			<subItem.icon className="h-4 w-4" />
																			<span className="group-data-[collapsible=icon]:hidden">
																				{subItem.label}
																			</span>
																		</Link>
																	</SidebarMenuSubButton>
																</SidebarMenuSubItem>
															);
														})}
													</SidebarMenuSub>
												</CollapsibleContent>
											</Collapsible>
										) : (
											<SidebarMenuButton
												asChild
												className={cn(
													"w-full",
													isActive &&
														"bg-sidebar-accent text-sidebar-accent-foreground"
												)}
												tooltip={route.label}
											>
												<Link href={route.href} onClick={closeMobileSidebar}>
													<route.icon className="h-4 w-4" />
													<span className="group-data-[collapsible=icon]:hidden">
														{route.label}
													</span>
												</Link>
											</SidebarMenuButton>
										)}
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="mb-8">
				<SidebarGroup>
					<SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
						Account
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{bottomRoutes.map((route) => {
								const isActive = pathname === route.href;
								return (
									<SidebarMenuItem key={route.href}>
										<SidebarMenuButton
											asChild
											className={cn(
												"w-full",
												isActive &&
													"bg-sidebar-accent text-sidebar-accent-foreground"
											)}
											tooltip={route.label}
										>
											{route.label === "Sign Out" ? (
												<button
													type="button"
													onClick={() => {
														closeMobileSidebar();
														signOut();
														router.push("/auth/signin");
													}}
													className="flex w-full items-center gap-2 text-left cursor-pointer"
												>
													<route.icon className="h-4 w-4" />
													<span className="group-data-[collapsible=icon]:hidden">
														{route.label}
													</span>
												</button>
											) : (
												<Link
													href={route.href}
													onClick={closeMobileSidebar}
													className="flex items-center gap-2 cursor-pointer"
												>
													<route.icon className="h-4 w-4" />
													<span className="group-data-[collapsible=icon]:hidden">
														{route.label}
													</span>
												</Link>
											)}
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarFooter>
		</Sidebar>
	);
}
