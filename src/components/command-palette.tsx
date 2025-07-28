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
import { useCommandPalette } from "@/stores/command-palette";
import {
	BookOpen,
	BookOpenCheck,
	Brain,
	BrainCog,
	FileText,
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
		label: "Course Materials",
		icon: BookOpen,
		href: "/dashboard/course-materials",
	},
	{
		label: "Notes",
		icon: FileText,
		href: "/dashboard/notes",
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
	{
		label: "Ask AI",
		icon: BrainCog,
		href: "/dashboard/ask-ai",
	},
];

const learningItems = [
	{
		label: "Cue Cards",
		icon: BookOpenCheck,
		href: "/dashboard/adaptive-learning/cuecards",
	},
];

const accountItems = [
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
