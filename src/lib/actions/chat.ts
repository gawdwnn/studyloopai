"use server";

import { db } from "@/db";
import { chatMessages, chatSessions } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import { and, desc, eq } from "drizzle-orm";

export interface ChatSession {
	id: string;
	title: string | null;
	courseIds: string[];
	createdAt: Date;
	updatedAt: Date;
}

export interface ChatMessage {
	id: string;
	sessionId: string;
	role: string;
	content: string;
	citations: unknown[];
	toolCalls: unknown[];
	createdAt: Date;
}

export async function createChatSession(
	courseIds: string[] = [],
	title?: string
): Promise<ChatSession | null> {
	return await withErrorHandling(
		async () => {
			const supabase = await getServerClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Authentication required");
			}

			const [session] = await db
				.insert(chatSessions)
				.values({
					userId: user.id,
					title: title || null,
					courseIds,
				})
				.returning();

			return {
				id: session.id,
				title: session.title,
				courseIds: session.courseIds || [],
				createdAt: session.createdAt,
				updatedAt: session.updatedAt,
			};
		},
		"createChatSession",
		null
	);
}

export async function getChatSession(
	sessionId: string
): Promise<ChatSession | null> {
	return await withErrorHandling(
		async () => {
			const supabase = await getServerClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Authentication required");
			}

			const [session] = await db
				.select()
				.from(chatSessions)
				.where(
					and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, user.id))
				)
				.limit(1);

			if (!session) {
				return null;
			}

			return {
				id: session.id,
				title: session.title,
				courseIds: session.courseIds || [],
				createdAt: session.createdAt,
				updatedAt: session.updatedAt,
			};
		},
		"getChatSession",
		null
	);
}

export async function getChatMessages(
	sessionId: string
): Promise<ChatMessage[]> {
	return await withErrorHandling(
		async () => {
			const supabase = await getServerClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Authentication required");
			}

			// Verify user owns the session first
			const session = await getChatSession(sessionId);
			if (!session) {
				return [];
			}

			const messages = await db
				.select()
				.from(chatMessages)
				.where(eq(chatMessages.sessionId, sessionId))
				.orderBy(chatMessages.createdAt);

			return messages.map((msg: typeof chatMessages.$inferSelect) => ({
				id: msg.id,
				sessionId: msg.sessionId,
				role: msg.role,
				content: msg.content,
				citations: msg.citations || [],
				toolCalls: msg.toolCalls || [],
				createdAt: msg.createdAt,
			}));
		},
		"getChatMessages",
		[]
	);
}

export async function saveChatMessage({
	sessionId,
	role,
	content,
	citations = [],
	toolCalls = [],
}: {
	sessionId: string;
	role: "user" | "assistant" | "system";
	content: string;
	citations?: unknown[];
	toolCalls?: unknown[];
}): Promise<ChatMessage | null> {
	return await withErrorHandling(
		async () => {
			const supabase = await getServerClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Authentication required");
			}

			// Verify user owns the session
			const session = await getChatSession(sessionId);
			if (!session) {
				throw new Error("Session not found");
			}

			const [message] = await db
				.insert(chatMessages)
				.values({
					sessionId,
					role,
					content,
					citations,
					toolCalls,
				})
				.returning();

			// Update session's updatedAt timestamp
			await db
				.update(chatSessions)
				.set({ updatedAt: new Date() })
				.where(eq(chatSessions.id, sessionId));

			return {
				id: message.id,
				sessionId: message.sessionId,
				role: message.role,
				content: message.content,
				citations: message.citations || [],
				toolCalls: message.toolCalls || [],
				createdAt: message.createdAt,
			};
		},
		"saveChatMessage",
		null
	);
}

export async function updateSessionTitle(
	sessionId: string,
	title: string
): Promise<boolean> {
	return await withErrorHandling(
		async () => {
			const supabase = await getServerClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Authentication required");
			}

			await db
				.update(chatSessions)
				.set({ title, updatedAt: new Date() })
				.where(
					and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, user.id))
				);

			return true;
		},
		"updateSessionTitle",
		false
	);
}

export async function getUserChatSessions(): Promise<ChatSession[]> {
	return await withErrorHandling(
		async () => {
			const supabase = await getServerClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				return [];
			}

			const sessions = await db
				.select()
				.from(chatSessions)
				.where(eq(chatSessions.userId, user.id))
				.orderBy(desc(chatSessions.updatedAt))
				.limit(50);

			return sessions.map((session: typeof chatSessions.$inferSelect) => ({
				id: session.id,
				title: session.title,
				courseIds: session.courseIds || [],
				createdAt: session.createdAt,
				updatedAt: session.updatedAt,
			}));
		},
		"getUserChatSessions",
		[]
	);
}
