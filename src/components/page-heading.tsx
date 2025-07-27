import { cn } from "@/lib/utils";

interface PageHeadingProps {
	title: string;
	description?: string;
	children?: React.ReactNode;
	className?: string;
}

export function PageHeading({
	title,
	description,
	children,
	className,
}: PageHeadingProps) {
	return (
		<div
			className={cn(
				"flex flex-col gap-4 md:flex-row md:items-start md:justify-between",
				className
			)}
		>
			<div className="space-y-1">
				<h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
					{title}
				</h1>
				{description && (
					<p className="text-sm text-muted-foreground sm:text-base">
						{description}
					</p>
				)}
			</div>
			{children && <div className="w-full md:w-auto">{children}</div>}
		</div>
	);
}
