"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const enhancedSheetVariants = cva(
	"bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
	{
		variants: {
			side: {
				top: "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 border-b",
				bottom: "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 border-t",
				left: "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 border-r",
				right: "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 border-l",
			},
			size: {
				compact: "",
				expanded: "",
				fullscreen: "",
			},
		},
		compoundVariants: [
			// Bottom sheet sizes
			{
				side: "bottom",
				size: "compact",
				class: "h-[50vh] min-h-[400px] max-h-[60vh]",
			},
			{
				side: "bottom",
				size: "expanded", 
				class: "h-[calc(100vh-4rem)] min-h-[600px]",
			},
			{
				side: "bottom",
				size: "fullscreen",
				class: "h-screen inset-0 border-0",
			},
			// Right sheet sizes
			{
				side: "right",
				size: "compact",
				class: "w-3/4 sm:max-w-sm",
			},
			{
				side: "right", 
				size: "expanded",
				class: "w-full sm:max-w-2xl",
			},
			{
				side: "right",
				size: "fullscreen",
				class: "w-screen inset-0 border-0",
			},
		],
		defaultVariants: {
			side: "bottom",
			size: "compact",
		},
	}
);

interface EnhancedSheetProps extends React.ComponentProps<typeof SheetPrimitive.Root> {}

function EnhancedSheet({ ...props }: EnhancedSheetProps) {
	return <SheetPrimitive.Root data-slot="enhanced-sheet" {...props} />;
}

function EnhancedSheetTrigger({
	...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
	return <SheetPrimitive.Trigger data-slot="enhanced-sheet-trigger" {...props} />;
}

function EnhancedSheetClose({
	...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
	return <SheetPrimitive.Close data-slot="enhanced-sheet-close" {...props} />;
}

function EnhancedSheetPortal({
	...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
	return <SheetPrimitive.Portal data-slot="enhanced-sheet-portal" {...props} />;
}

function EnhancedSheetOverlay({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
	return (
		<SheetPrimitive.Overlay
			data-slot="enhanced-sheet-overlay"
			className={cn(
				"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
				className
			)}
			{...props}
		/>
	);
}

interface EnhancedSheetContentProps
	extends React.ComponentProps<typeof SheetPrimitive.Content>,
		VariantProps<typeof enhancedSheetVariants> {
	hideCloseButton?: boolean;
}

function EnhancedSheetContent({
	className,
	children,
	side = "bottom",
	size = "compact",
	hideCloseButton = false,
	...props
}: EnhancedSheetContentProps) {
	return (
		<EnhancedSheetPortal>
			<EnhancedSheetOverlay />
			<SheetPrimitive.Content
				data-slot="enhanced-sheet-content"
				className={cn(enhancedSheetVariants({ side, size }), className)}
				{...props}
			>
				{children}
				{!hideCloseButton && (
					<SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none z-10">
						<XIcon className="size-4" />
						<span className="sr-only">Close</span>
					</SheetPrimitive.Close>
				)}
			</SheetPrimitive.Content>
		</EnhancedSheetPortal>
	);
}

function EnhancedSheetHeader({ 
	className, 
	...props 
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="enhanced-sheet-header"
			className={cn(
				"flex flex-col gap-1.5 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
				className
			)}
			{...props}
		/>
	);
}

function EnhancedSheetFooter({ 
	className, 
	...props 
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="enhanced-sheet-footer"
			className={cn(
				"mt-auto flex flex-col gap-2 p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
				className
			)}
			{...props}
		/>
	);
}

function EnhancedSheetTitle({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
	return (
		<SheetPrimitive.Title
			data-slot="enhanced-sheet-title"
			className={cn("text-foreground font-semibold text-lg", className)}
			{...props}
		/>
	);
}

function EnhancedSheetDescription({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
	return (
		<SheetPrimitive.Description
			data-slot="enhanced-sheet-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

export {
	EnhancedSheet,
	EnhancedSheetTrigger,
	EnhancedSheetClose,
	EnhancedSheetContent,
	EnhancedSheetHeader,
	EnhancedSheetFooter,
	EnhancedSheetTitle,
	EnhancedSheetDescription,
	type EnhancedSheetContentProps,
};