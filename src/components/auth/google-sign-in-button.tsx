"use client";

import { signInWithOAuth } from "@/lib/actions/auth";
import { useFormState, useFormStatus } from "react-dom";
import { GoogleIcon } from "../icons/google-icon";
import { Button } from "../ui/button";

function SubmitButton({ variant }: { variant: "signin" | "signup" }) {
	const { pending } = useFormStatus();
	const buttonText = variant === "signin" ? "Sign in with Google" : "Sign up with Google";

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
}

const initialState = { error: null };

export function GoogleSignInButton({ variant }: GoogleSignInButtonProps) {
	const [state, formAction] = useFormState(signInWithOAuth, initialState);

	return (
		<form action={formAction}>
			<SubmitButton variant={variant} />
			{state.error && <p className="mt-2 text-xs text-destructive">{state.error.message}</p>}
		</form>
	);
}
