"use client";

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
import { cn } from "@/lib/utils";
import {
  BookMarked,
  BookOpen,
  BookOpenCheck,
  Brain,
  BrainCog,
  Calendar,
  ChevronDown,
  FileQuestion,
  GraduationCap,
  HelpCircle,
  Home,
  LogOut,
  MessageSquare,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

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
    label: "Planner",
    icon: Calendar,
    href: "/dashboard/course-planner",
  },
  {
    label: "Course Materials",
    icon: BookOpen,
    href: "/dashboard/course-materials",
    subItems: [
      {
        label: "Uploaded Files",
        href: "/dashboard/course-materials/files",
        icon: BookOpen,
      },
      {
        label: "Study Notes",
        href: "/dashboard/course-materials/notes",
        icon: BookMarked,
      },
    ],
  },
  {
    label: "Adaptive Learning",
    icon: Brain,
    href: "/dashboard/adaptive-learning",
    subItems: [
      {
        label: "Quizzes",
        href: "/dashboard/adaptive-learning/quizzes",
        icon: FileQuestion,
      },
      {
        label: "Flashcards",
        href: "/dashboard/adaptive-learning/flashcards",
        icon: BookOpenCheck,
      },
      {
        label: "Multiple Choice",
        href: "/dashboard/adaptive-learning/multiple-choice",
        icon: HelpCircle,
      },
      {
        label: "Open Questions",
        href: "/dashboard/adaptive-learning/open-questions",
        icon: GraduationCap,
      },
    ],
  },
  {
    label: "Feedback",
    icon: MessageSquare,
    href: "/dashboard/feedback",
  },
];

const bottomRoutes: RouteItem[] = [
  {
    label: "Ask AI",
    icon: BrainCog,
    href: "/dashboard/ask-ai",
  },
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
  const pathname = usePathname();
  const [openItems, setOpenItems] = useState<string[]>([]);
  const { setOpenMobile } = useSidebar();

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

  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-14 items-center px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="font-semibold group-data-[collapsible=icon]:hidden">
              StudyLoop AI
            </span>
          </Link>
        </div>
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
                            className={cn(
                              "w-full",
                              isActive &&
                                "bg-sidebar-accent text-sidebar-accent-foreground"
                            )}
                          >
                            {route.onClick ? (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  closeMobileSidebar();
                                  await route.onClick?.(e);
                                }}
                                className="flex w-full items-center gap-2 text-left"
                              >
                                <route.icon className="h-4 w-4" />
                                <span className="group-data-[collapsible=icon]:hidden">
                                  {route.label}
                                </span>
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
                              </Link>
                            )}
                            <ChevronDown
                              className={cn(
                                "ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden",
                                isOpen && "rotate-180"
                              )}
                            />
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
                      className={cn(
                        "w-full",
                        isActive &&
                          "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                    >
                      {route.label === "Sign Out" ? (
                        <button
                          type="button"
                          onClick={signOut}
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
