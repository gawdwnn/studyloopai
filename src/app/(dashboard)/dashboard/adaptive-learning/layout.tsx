import SessionErrorBoundary from "@/components/session/session-error-boundary";

export default function AdaptiveLearningLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <SessionErrorBoundary>{children}</SessionErrorBoundary>;
}
