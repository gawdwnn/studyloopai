import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description?: string;
	children?: React.ReactNode;
	className?: string;
}

export function EmptyState({
	icon: Icon,
	title,
	description,
	children,
	className,
}: EmptyStateProps) {
	return (
		<div
			className={cn(
				"flex h-[calc(100vh-300px)] flex-col items-center justify-center text-center",
				className
			)}
		>
			<div className="rounded-full bg-muted p-6 mb-6">
				<Icon className="h-16 w-16 text-muted-foreground sm:h-20 sm:w-20" />
			</div>
			<h2 className="text-xl font-bold tracking-tight mb-2 sm:text-2xl lg:text-3xl">
				{title}
			</h2>
			{description && (
				<p className="text-sm text-muted-foreground mb-6 max-w-md sm:text-base">
					{description}
				</p>
			)}
			{children}
		</div>
	);
}
