"use client";

import { cn } from "@/lib/utils/index";
import React, { type KeyboardEvent } from "react";

export const PromptInputContentEditable = React.forwardRef<
	HTMLDivElement,
	{
		placeholder?: string;
		onInput?: () => void;
		onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
		onFocus?: () => void;
		onBlur?: () => void;
		className?: string;
		"aria-disabled"?: boolean;
		"data-placeholder"?: string;
	}
>(({ className, placeholder, ...props }, ref) => {
	return (
		<div
			ref={ref}
			contentEditable
			suppressContentEditableWarning
			className={cn(
				"w-full resize-none rounded-none border-none p-3 shadow-none outline-none ring-0",
				"bg-transparent dark:bg-transparent field-sizing-content max-h-[6lh]",
				"focus-visible:ring-0",
				"[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground [&:empty]:before:pointer-events-none",
				className
			)}
			role="textbox"
			aria-multiline="true"
			tabIndex={0}
			{...props}
		/>
	);
});

PromptInputContentEditable.displayName = "PromptInputContentEditable";
