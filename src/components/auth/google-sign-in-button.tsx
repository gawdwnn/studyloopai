"use client";

import { signInWithOAuth } from "@/lib/actions/auth";
import type { AuthErrorDetails } from "@/lib/auth/errors";
import { useFormState, useFormStatus } from "react-dom";
import { GoogleIcon } from "../icons/google-icon";
import { Button } from "../ui/button";

function SubmitButton({ variant }: { variant: "signin" | "signup" }) {
	const { pending } = useFormStatus();
	const buttonText =
		variant === "signin" ? "Sign in with Google" : "Sign up with Google";

	return (
		<Button
			type="submit"
			className="w-full"
			variant="outline"
			disabled={pending}
			aria-disabled={pending}
		>
			{pending ? (
				"Redirecting..."
			) : (
				<>
					<GoogleIcon className="mr-2 h-4 w-4" />
					{buttonText}
				</>
			)}
		</Button>
	);
}

interface GoogleSignInButtonProps {
	variant: "signin" | "signup";
	onError?: (error: AuthErrorDetails) => void;
}

const initialState = { error: null };

export function GoogleSignInButton({
	variant,
	onError,
}: GoogleSignInButtonProps) {
	const [state, formAction] = useFormState(signInWithOAuth, initialState);

	// Notify parent component of errors for consistent display
	if (state.error && onError) {
		onError(state.error);
	}

	return (
		<form action={formAction}>
			<SubmitButton variant={variant} />
		</form>
	);
}
