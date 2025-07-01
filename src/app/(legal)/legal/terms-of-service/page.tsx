import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Terms of Service | StudyLoop AI",
	description: "Terms of service for using StudyLoop AI",
};

export default function TermsOfServicePage() {
	return (
		<div className="container mx-auto px-4 py-8 max-w-4xl">
			<h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

			<div className="space-y-6">
				<section>
					<h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
					<p className="text-muted-foreground">
						By accessing and using StudyLoop AI, you agree to be bound by these Terms of Service.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">2. Use of Service</h2>
					<p className="text-muted-foreground">
						StudyLoop AI is designed to help students with their studies. You agree to use the
						service for educational purposes only and in accordance with these terms.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
					<p className="text-muted-foreground">
						You are responsible for maintaining the confidentiality of your account and for all
						activities that occur under your account.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">4. Intellectual Property</h2>
					<p className="text-muted-foreground">
						All content and materials available on StudyLoop AI are protected by intellectual
						property rights.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">5. Limitation of Liability</h2>
					<p className="text-muted-foreground">
						StudyLoop AI is provided "as is" without any warranties, expressed or implied.
					</p>
				</section>
			</div>
		</div>
	);
}
