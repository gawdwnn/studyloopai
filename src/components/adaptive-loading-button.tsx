"use client";

import { Button, type buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type React from "react";

export interface LoadingButtonProps
	extends Omit<
		React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>,
		"disabled"
	> {
	isLoading?: boolean;
	loadingText?: string;
	loadingIcon?: React.ReactNode;
	children?: React.ReactNode;
	disabled?: boolean;
}

/**
 * Enhanced button with loading states for async operations
 * Automatically disables and shows loading indicator during async operations
 */
export function LoadingButton({
	children,
	isLoading = false,
	loadingText,
	loadingIcon,
	disabled,
	className,
	...props
}: LoadingButtonProps) {
	const LoadingIcon = loadingIcon || (
		<Loader2 className="h-4 w-4 animate-spin" />
	);

	return (
		<Button
			disabled={disabled || isLoading}
			className={cn(
				"transition-all duration-200",
				isLoading && "cursor-not-allowed",
				className
			)}
			{...props}
		>
			{isLoading && (
				<span className="flex items-center gap-2">
					{LoadingIcon}
					{loadingText || children}
				</span>
			)}
			{!isLoading && children}
		</Button>
	);
}

/**
 * Loading button variant for content generation
 */
export function GeneratingButton({
	isGenerating,
	...props
}: LoadingButtonProps & { isGenerating: boolean }) {
	return (
		<LoadingButton
			isLoading={isGenerating}
			loadingText="Generating..."
			loadingIcon={<Loader2 className="h-4 w-4 animate-spin" />}
			{...props}
		/>
	);
}

/**
 * Loading button variant for session starting
 */
export function StartingButton({
	isStarting,
	...props
}: LoadingButtonProps & { isStarting: boolean }) {
	return (
		<LoadingButton
			isLoading={isStarting}
			loadingText="Starting Session..."
			{...props}
		/>
	);
}
