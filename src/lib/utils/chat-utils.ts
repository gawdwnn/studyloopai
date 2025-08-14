import type { UIMessage } from "ai";

export interface ChatMessage {
	id: string;
	sessionId: string;
	role: string;
	content: string;
	citations: unknown[];
	toolCalls: unknown[];
	createdAt: Date;
}

// Utility function to convert database messages to UI messages format
export function convertToUIMessages(dbMessages: ChatMessage[]): UIMessage[] {
	return dbMessages.map((msg) => ({
		id: msg.id,
		role: msg.role as "user" | "assistant" | "system",
		parts: [
			{
				type: "text",
				text: msg.content,
			},
		],
		// Add tool invocations if present
		...(msg.toolCalls &&
			Array.isArray(msg.toolCalls) &&
			msg.toolCalls.length > 0 && {
				toolInvocations: msg.toolCalls,
			}),
		...(msg.citations &&
			Array.isArray(msg.citations) &&
			msg.citations.length > 0 && {
				citations: msg.citations,
			}),
		createdAt: msg.createdAt,
	}));
}

// Generate session title from first user message
export function generateSessionTitle(firstMessage: string): string {
	// Clean and truncate the message for the title
	const cleaned = firstMessage.trim().replace(/\s+/g, " ");
	const maxLength = 50;

	if (cleaned.length <= maxLength) {
		return cleaned;
	}

	// Find the last space before maxLength to avoid cutting words
	const truncated = cleaned.substring(0, maxLength);
	const lastSpace = truncated.lastIndexOf(" ");

	return lastSpace > 0
		? `${truncated.substring(0, lastSpace)}...`
		: `${truncated}...`;
}
