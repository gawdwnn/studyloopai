"use client";

import { useFullscreen } from "@/components/fullscreen-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Maximize, Minimize } from "lucide-react";

interface FullscreenButtonProps {
	className?: string;
	variant?: "ghost" | "outline" | "default" | "destructive" | "secondary";
	size?: "default" | "sm" | "lg" | "icon";
	showLabel?: boolean;
}

export function FullscreenButton({
	className,
	variant = "ghost",
	size = "icon",
	showLabel = false,
}: FullscreenButtonProps) {
	const { isFullscreen, isSupported, toggleFullscreen } = useFullscreen();

	if (!isSupported) {
		return null;
	}

	const buttonTitle = isFullscreen ? "Exit fullscreen" : "Enter fullscreen";
	const Icon = isFullscreen ? Minimize : Maximize;

	return (
		<Button
			variant={variant}
			size={size}
			onClick={toggleFullscreen}
			className={cn(
				"bg-gray-100 hover:bg-gray-200 rounded-full",
				size === "icon" && "h-10 w-10",
				className
			)}
			title={buttonTitle}
			aria-label={buttonTitle}
		>
			<Icon className="h-6 w-6 text-gray-600" />
			{showLabel && (
				<span className="ml-2">
					{isFullscreen ? "Exit fullscreen" : "Fullscreen"}
				</span>
			)}
		</Button>
	);
}
