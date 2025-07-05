"use client";

import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import { useCommandPalette } from "@/lib/stores/command-palette";
import {
	BookOpen,
	Brain,
	BrainCog,
	Calendar,
	FileQuestion,
	GraduationCap,
	Home,
	MessageSquare,
	Moon,
	Settings,
	Sun,
	User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";

const navigationItems = [
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
	},
	{
		label: "Adaptive Learning",
		icon: Brain,
		href: "/dashboard/adaptive-learning",
	},
	{
		label: "Feedback",
		icon: MessageSquare,
		href: "/dashboard/feedback",
	},
];

const learningItems = [
	{
		label: "Quizzes",
		icon: FileQuestion,
		href: "/dashboard/adaptive-learning/quizzes",
	},
	{
		label: "Cuecards",
		icon: BookOpen,
		href: "/dashboard/adaptive-learning/cuecards",
	},
	{
		label: "Multiple Choice",
		icon: FileQuestion,
		href: "/dashboard/adaptive-learning/multiple-choice",
	},
	{
		label: "Open Questions",
		icon: GraduationCap,
		href: "/dashboard/adaptive-learning/open-questions",
	},
];

const accountItems = [
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
];

export function CommandPalette() {
	const { isOpen, toggle, close } = useCommandPalette();
	const router = useRouter();
	const { setTheme } = useTheme();

	// Close on escape
	useHotkeys(
		"esc",
		() => {
			if (isOpen) {
				close();
			}
		},
		{ enableOnFormTags: true }
	);

	const runCommand = useCallback(
		(href: string) => {
			close();
			router.push(href);
		},
		[router, close]
	);

	return (
		<CommandDialog open={isOpen} onOpenChange={toggle}>
			<CommandInput placeholder="Type a command or search... (⌘K to open)" />
			<CommandList>
				<CommandEmpty>No results found.</CommandEmpty>
				<CommandGroup heading="Navigation">
					{navigationItems.map((item) => (
						<CommandItem key={item.href} onSelect={() => runCommand(item.href)}>
							<item.icon className="mr-2 h-4 w-4" />
							<span>{item.label}</span>
						</CommandItem>
					))}
				</CommandGroup>
				<CommandSeparator />
				<CommandGroup heading="Learning Tools">
					{learningItems.map((item) => (
						<CommandItem key={item.href} onSelect={() => runCommand(item.href)}>
							<item.icon className="mr-2 h-4 w-4" />
							<span>{item.label}</span>
						</CommandItem>
					))}
				</CommandGroup>
				<CommandSeparator />
				<CommandGroup heading="Account">
					{accountItems.map((item) => (
						<CommandItem key={item.href} onSelect={() => runCommand(item.href)}>
							<item.icon className="mr-2 h-4 w-4" />
							<span>{item.label}</span>
						</CommandItem>
					))}
				</CommandGroup>
				<CommandSeparator />
				<CommandGroup heading="Theme">
					<CommandItem onSelect={() => setTheme("light")}>
						<Sun className="mr-2 h-4 w-4" />
						<span>Light</span>
					</CommandItem>
					<CommandItem onSelect={() => setTheme("dark")}>
						<Moon className="mr-2 h-4 w-4" />
						<span>Dark</span>
					</CommandItem>
					<CommandItem onSelect={() => setTheme("system")}>
						<Settings className="mr-2 h-4 w-4" />
						<span>System</span>
					</CommandItem>
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	);
}
