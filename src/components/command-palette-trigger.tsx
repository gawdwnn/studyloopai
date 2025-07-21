"use client";

import { Button } from "@/components/ui/button";
import { useCommandPalette } from "@/stores/command-palette";
import { Search } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";

export function CommandPaletteTrigger() {
	const { toggle } = useCommandPalette();

	// Toggle command palette
	useHotkeys(
		"mod+k",
		(e) => {
			e.preventDefault();
			toggle();
		},
		{ enableOnFormTags: true }
	);

	return (
		<Button
			variant="outline"
			className="h-8 w-9 p-0 lg:w-auto lg:px-4"
			onClick={toggle}
		>
			<Search className="h-4 w-4 lg:mr-2" />
			<span className="hidden lg:inline">Search...</span>
			<kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 lg:flex">
				<span className="text-xs">⌘</span>K
			</kbd>
		</Button>
	);
}
