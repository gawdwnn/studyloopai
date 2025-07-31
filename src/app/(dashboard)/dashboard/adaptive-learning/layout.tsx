import { FullscreenProvider } from "@/components/fullscreen-context";
import SessionErrorBoundary from "@/components/session/session-error-boundary";

export default function AdaptiveLearningLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<FullscreenProvider>
			<SessionErrorBoundary>{children}</SessionErrorBoundary>
		</FullscreenProvider>
	);
}
