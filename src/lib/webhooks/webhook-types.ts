export interface WebhookPayload {
	eventType: string;
	eventId: string;
	data: unknown;
	headers: Record<string, string>;
	rawBody: string;
	receivedAt: Date;
	source: "polar";
}

export interface WebhookProcessingResult {
	success: boolean;
	shouldRetry: boolean;
	error?: string;
	result?: unknown;
}
