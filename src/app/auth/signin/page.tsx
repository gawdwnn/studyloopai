"use client";

import { SignInForm } from "@/components/auth/sign-in-form";
import { SignInFormSkeleton } from "@/components/auth/sign-in-form-skeleton";
import { SignInHero } from "@/components/auth/sign-in-hero";
import { motion } from "framer-motion";
import { Suspense } from "react";

export default function SignInPage() {
	return (
		<div className="min-h-screen flex flex-col md:flex-row">
			<SignInHero />

			<motion.div
				className="lg:w-1/2 bg-background flex flex-col justify-center p-6 lg:p-8 xl:p-12"
				initial={{ opacity: 0, x: 50 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.8, delay: 0.2 }}
			>
				<Suspense fallback={<SignInFormSkeleton />}>
					<SignInForm />
				</Suspense>
			</motion.div>
		</div>
	);
}
