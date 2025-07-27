"use client";

import { Button, type buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type React from "react";
import { forwardRef } from "react";

interface LoadingButtonProps
	extends React.ComponentProps<"button">,
		VariantProps<typeof buttonVariants> {
	loading?: boolean;
	loadingText?: string;
}

const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
	(
		{
			children,
			loading = false,
			loadingText,
			className,
			disabled,
			variant,
			size,
			...props
		},
		ref
	) => {
		return (
			<Button
				ref={ref}
				variant={variant}
				size={size}
				className={cn(
					"relative overflow-hidden hover:cursor-pointer",
					className,
					(disabled || loading) && "hover:cursor-not-allowed"
				)}
				disabled={disabled || loading}
				aria-busy={loading}
				aria-label={loading ? loadingText || "Loading, please wait" : undefined}
				{...props}
			>
				<div
					className={cn(
						"flex items-center justify-center transition-opacity duration-200",
						loading ? "opacity-0" : "opacity-100"
					)}
					aria-hidden={loading}
				>
					{children}
				</div>
				{loading && (
					<div
						className="absolute inset-0 flex items-center justify-center"
						aria-live="polite"
					>
						<Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
						<span>{loadingText || "Loading..."}</span>
					</div>
				)}
			</Button>
		);
	}
);

LoadingButton.displayName = "LoadingButton";

export { LoadingButton };
