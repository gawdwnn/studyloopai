"use client";

import { LoadingButton } from "@/components/loading-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { AuthErrorDetails } from "@/lib/errors/auth";
import { cn } from "@/lib/utils";
import { type MagicLinkFormData, magicLinkSchema } from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

interface MagicLinkFormProps {
	onSubmit: (data: MagicLinkFormData) => Promise<void>;
	loading?: boolean;
	error?: AuthErrorDetails | null;
	className?: string;
	showLabel?: boolean;
	placeholder?: string;
}

export function MagicLinkForm({
	onSubmit,
	loading = false,
	error,
	className,
	showLabel = true,
	placeholder = "Enter your email address",
}: MagicLinkFormProps) {
	const [isSubmitted, setIsSubmitted] = useState(false);

	const form = useForm<MagicLinkFormData>({
		resolver: zodResolver(magicLinkSchema),
		defaultValues: {
			email: "",
		},
	});

	const handleSubmit = async (data: MagicLinkFormData) => {
		try {
			await onSubmit(data);
			setIsSubmitted(true);
		} catch (_err) {
			// Error handling is managed by parent component
			setIsSubmitted(false);
		}
	};

	if (isSubmitted) {
		return (
			<div className={cn("text-center space-y-4", className)}>
				<div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
					<Mail className="w-8 h-8 text-primary" />
				</div>
				<div className="space-y-2">
					<h3 className="text-lg font-semibold text-foreground">Check your email</h3>
					<p className="text-sm text-muted-foreground">
						We've sent a magic link to{" "}
						<span className="font-medium text-foreground">{form.getValues("email")}</span>
					</p>
					<p className="text-xs text-muted-foreground">
						Click the link in your email to sign in. The link will expire in 1 hour.
					</p>
				</div>
				<button
					type="button"
					onClick={() => {
						setIsSubmitted(false);
						form.reset();
					}}
					className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-2 py-1"
					aria-label="Go back to email form"
				>
					Try a different email
				</button>
			</div>
		);
	}

	return (
		<div className={cn("space-y-4", className)}>
			{error && !error.field && (
				<Alert variant="destructive">
					<AlertDescription>{error.message}</AlertDescription>
				</Alert>
			)}

			<Form {...form}>
				<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								{showLabel ? (
									<FormLabel>Email Address</FormLabel>
								) : (
									<FormLabel className="sr-only">Email Address</FormLabel>
								)}
								<FormControl>
									<div className="relative group">
										<Mail
											className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-colors"
											aria-hidden="true"
										/>
										<Input
											type="email"
											placeholder={placeholder}
											className="pl-10 focus:ring-2 focus:ring-primary/20 transition-all"
											aria-label={showLabel ? undefined : "Email address"}
											aria-describedby="email-helper-text"
											disabled={loading}
											{...field}
										/>
									</div>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<LoadingButton
						type="submit"
						className="w-full text-base"
						loading={loading}
						disabled={loading}
					>
						Send Magic Link
					</LoadingButton>
				</form>
			</Form>

			<div className="text-center">
				<p id="email-helper-text" className="text-xs text-muted-foreground">
					We'll send you a secure link to sign in without a password
				</p>
			</div>
		</div>
	);
}
