"use client";

import { Button } from "@/components/ui/button";
import { useFloatingChat } from "@/lib/stores/floating-chat";
import { cn } from "@/lib/utils";
import { Maximize2, MessageCircle, Minimize2, X } from "lucide-react";
import { useCallback, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export function FloatingChat() {
	const { isOpen, isMinimized, toggle, close, toggleMinimize } = useFloatingChat();
	const inputRef = useRef<HTMLInputElement>(null);

	// Toggle chat visibility
	useHotkeys(
		"mod+j",
		(e) => {
			e.preventDefault();
			toggle();
		},
		{ enableOnFormTags: true }
	);

	// Toggle minimize/maximize
	useHotkeys(
		"mod+m",
		(e) => {
			e.preventDefault();
			if (isOpen) {
				toggleMinimize();
			}
		},
		{ enableOnFormTags: true }
	);

	// Focus input when chat is open
	useHotkeys(
		"mod+l",
		(e) => {
			e.preventDefault();
			if (isOpen && !isMinimized) {
				inputRef.current?.focus();
			}
		},
		{ enableOnFormTags: true }
	);

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

	// Handle input submission
	const handleSubmit = useCallback((e: React.FormEvent) => {
		e.preventDefault();
		const input = inputRef.current;
		if (input?.value.trim()) {
			input.value = "";
		}
	}, []);

	return (
		<div className="fixed bottom-6 right-6 z-50">
			{!isOpen && (
				<Button size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={toggle}>
					<MessageCircle className="h-6 w-6" />
				</Button>
			)}

			{isOpen && (
				<div
					className={cn(
						"w-[380px] rounded-lg border bg-background shadow-lg transition-all duration-200",
						isMinimized ? "h-14" : "h-[500px]"
					)}
				>
					{/* Header */}
					<div className="flex h-14 items-center justify-between border-b px-4">
						<div className="flex items-center gap-2">
							<MessageCircle className="h-5 w-5" />
							{/* <span className="font-medium">Chat Assistant</span> */}
							<span className="text-xs text-muted-foreground">(⌘J to toggle, ⌘M to minimize)</span>
						</div>
						<div className="flex items-center gap-2">
							<Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMinimize}>
								{isMinimized ? (
									<Maximize2 className="h-4 w-4" />
								) : (
									<Minimize2 className="h-4 w-4" />
								)}
							</Button>
							<Button variant="ghost" size="icon" className="h-8 w-8" onClick={close}>
								<X className="h-4 w-4" />
							</Button>
						</div>
					</div>

					{/* Chat Content */}
					{!isMinimized && (
						<div className="flex h-[calc(500px-3.5rem)] flex-col">
							{/* Messages Area */}
							<div className="flex-1 overflow-y-auto p-4">
								<p className="text-muted-foreground">Chat interface coming soon...</p>
							</div>

							{/* Input Area */}
							<div className="border-t p-4">
								<form onSubmit={handleSubmit} className="flex items-center gap-2">
									<input
										ref={inputRef}
										type="text"
										placeholder="Type your message... (⌘L to focus)"
										className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
									/>
									<Button type="submit" size="sm">
										Send
									</Button>
								</form>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
