import { tools } from "@/components/chat/tools";
import {
	createChatSession,
	getChatMessages,
	getChatSession,
	saveChatMessage,
} from "@/lib/actions/chat";
import { getTextGenerationModel } from "@/lib/ai/config";
import { getServerClient } from "@/lib/supabase/server";
import {
	convertToUIMessages,
	generateSessionTitle,
} from "@/lib/utils/chat-utils";
import { logger } from "@/lib/utils/logger";
import {
	type UIMessage,
	convertToModelMessages,
	createUIMessageStream,
	createUIMessageStreamResponse,
	stepCountIs,
	streamText,
} from "ai";
import { NextResponse } from "next/server";
import { getSystemPrompt } from "./prompt";

interface BodyData {
	messages: UIMessage[];
	courseIds?: string[];
	sessionId?: string;
}

export async function POST(req: Request) {
	// Authentication
	const supabase = await getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 }
		);
	}

	// Parse request body
	const { messages, courseIds = [], sessionId }: BodyData = await req.json();

	try {
		// Session management
		let currentSessionId = sessionId;
		let sessionMessages = messages;

		if (sessionId) {
			// Load existing session
			const session = await getChatSession(sessionId);
			if (!session) {
				return NextResponse.json(
					{ error: "Session not found" },
					{ status: 404 }
				);
			}

			// Load message history if not provided
			if (messages.length === 0) {
				const dbMessages = await getChatMessages(sessionId);
				sessionMessages = convertToUIMessages(dbMessages);
			}
		} else {
			// Create new session if we have a user message
			const userMessage = messages.find((msg) => msg.role === "user");
			if (userMessage && userMessage.parts?.[0]?.type === "text") {
				const title = generateSessionTitle(userMessage.parts[0].text);
				const newSession = await createChatSession(courseIds, title);
				if (newSession) {
					currentSessionId = newSession.id;
				}
			}
		}

		// Save user message if we have a session
		if (currentSessionId && messages.length > 0) {
			const lastMessage = messages[messages.length - 1];
			if (
				lastMessage.role === "user" &&
				lastMessage.parts?.[0]?.type === "text"
			) {
				await saveChatMessage({
					sessionId: currentSessionId,
					role: "user",
					content: lastMessage.parts[0].text,
				});
			}
		}

		// Get AI model
		const { model } = getTextGenerationModel("claude-3-5-sonnet-20241022");

		// Get dynamic system prompt
		const systemPrompt = getSystemPrompt({ courseIds });

		return createUIMessageStreamResponse({
			stream: createUIMessageStream({
				originalMessages: sessionMessages,
				execute: ({ writer }) => {
					const result = streamText({
						model,
						system: systemPrompt,
						messages: convertToModelMessages(sessionMessages),
						stopWhen: stepCountIs(20),
						tools: tools({ courseIds, writer }),
						onError: (error) => {
							logger.error("Error communicating with AI");
							logger.error(JSON.stringify(error, null, 2));
						},
						onFinish: async (completion) => {
							// Save assistant response if we have a session
							if (currentSessionId && completion.text) {
								await saveChatMessage({
									sessionId: currentSessionId,
									role: "assistant",
									content: completion.text,
									toolCalls: completion.toolCalls || [],
								});
							}
						},
					});

					result.consumeStream();

					writer.merge(
						result.toUIMessageStream({
							sendStart: false,
							messageMetadata: () => ({
								model: "Claude 3.5 Sonnet",
								sessionId: currentSessionId,
							}),
						})
					);
				},
			}),
		});
	} catch (error) {
		logger.error("Error in chat route:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
