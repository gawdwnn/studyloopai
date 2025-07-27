import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Cookie Policy | StudyLoop AI",
	description: "Cookie policy for StudyLoop AI",
};

export default function CookiePolicyPage() {
	return (
		<div className="container mx-auto px-4 py-8 max-w-4xl">
			<h1 className="text-3xl font-bold mb-6">Cookie Policy</h1>

			<div className="space-y-6">
				<section>
					<h2 className="text-2xl font-semibold mb-4">1. What Are Cookies</h2>
					<p className="text-muted-foreground">
						Cookies are small text files that are placed on your device when you
						visit our website. They help us provide you with a better
						experience.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">2. How We Use Cookies</h2>
					<p className="text-muted-foreground">
						We use cookies to remember your preferences, understand how you use
						our website, and improve our services.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">
						3. Types of Cookies We Use
					</h2>
					<p className="text-muted-foreground">
						We use essential cookies for the website to function properly, and
						optional cookies to enhance your experience.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">4. Managing Cookies</h2>
					<p className="text-muted-foreground">
						You can control and manage cookies through your browser settings.
						However, disabling certain cookies may affect the functionality of
						our website.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">
						5. Updates to This Policy
					</h2>
					<p className="text-muted-foreground">
						We may update this cookie policy from time to time. We will notify
						you of any changes by posting the new policy on this page.
					</p>
				</section>
			</div>
		</div>
	);
}
