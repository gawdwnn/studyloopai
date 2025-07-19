"use client";

import { SignInForm } from "@/components/auth/sign-in-form";
import { SignInFormSkeleton } from "@/components/auth/sign-in-form-skeleton";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

export default function SignInPage() {
	return (
		<div className="min-h-screen flex flex-col lg:flex-row relative">
			<Link
				href="/"
				className="absolute top-3 left-3 z-10 flex items-center gap-2 text-sm text-border hover:text-background border border-border hover:bg-foreground hover:border-foreground rounded-md px-3 py-1.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
				aria-label="Back to homepage"
			>
				<ArrowLeft className="h-4 w-4" />
			</Link>

			{/* Hero Image Section */}
			<motion.div
				className="h-64 lg:h-auto lg:w-1/2 relative"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.5 }}
			>
				<Image
					src="/login.png"
					alt="Students studying together"
					fill
					className="object-cover"
					priority
					sizes="(max-width: 1024px) 100vw, 50vw"
				/>
			</motion.div>

			{/* Form Section */}
			<motion.div
				className="flex-1 lg:w-1/2 bg-background flex flex-col justify-center px-4 sm:px-6 lg:px-10 xl:px-14"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.5, delay: 0.1 }}
			>
				<Suspense fallback={<SignInFormSkeleton />}>
					<SignInForm />
				</Suspense>
			</motion.div>
		</div>
	);
}
