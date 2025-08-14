"use client";

import { Actions } from "@/components/ai-elements/actions";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
} from "@/components/ai-elements/tool";
import { EnhancedPromptInput } from "@/components/chat/enhanced-prompt-input";
import {
	extractToolName,
	getToolDisplayName,
} from "@/components/chat/tool-utils";
import { useChatMessages, useChatSession } from "@/hooks/use-chat-sessions";
import { convertToUIMessages } from "@/lib/utils/chat-utils";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function AskAIPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const sessionId = searchParams.get("session");

	// useChat hook for AI SDK integration
	const { messages, sendMessage, status, setMessages } = useChat({
		transport: new DefaultChatTransport({
			api: "/api/chat",
		}),
		onFinish: ({ message }) => {
			// Handle session creation navigation once API metadata is working
			console.log("Message finished:", message);
		},
	});

	// Use React Query for session and messages data
	const {
		data: session,
		isLoading: isLoadingSession,
		error: sessionError,
	} = useChatSession(sessionId);

	const {
		data: sessionMessages = [],
		isLoading: isLoadingMessages,
		error: messagesError,
	} = useChatMessages(sessionId);

	// Clear messages when no session is selected
	useEffect(() => {
		if (!sessionId) {
			setMessages([]);
		}
	}, [sessionId, setMessages]);

	// Handle errors - redirect to new chat if session not found
	useEffect(() => {
		if (sessionError || messagesError) {
			console.error("Error loading session:", sessionError || messagesError);
			router.push("/dashboard/ask-ai");
		}
	}, [sessionError, messagesError, router]);

	// Handle session not found - redirect to new chat
	useEffect(() => {
		if (!isLoadingSession && sessionId && !session && !sessionError) {
			router.push("/dashboard/ask-ai");
		}
	}, [isLoadingSession, sessionId, session, sessionError, router]);

	// Update messages when session data is loaded
	useEffect(() => {
		if (session && sessionMessages && !isLoadingMessages && !messagesError) {
			const uiMessages = convertToUIMessages(sessionMessages);
			setMessages(uiMessages);
		}
	}, [session, sessionMessages, isLoadingMessages, messagesError, setMessages]);

	// Handle session selection (navigate to session)
	const handleSessionSelect = (sessionId: string) => {
		router.push(`/dashboard/ask-ai?session=${sessionId}`);
	};

	// Handle submission from EnhancedPromptInput
	const handleSubmit = (data: { message: string; courseIds: string[] }) => {
		if (!data.message.trim()) return;

		// Send message with courseIds and sessionId
		sendMessage(
			{
				text: data.message,
			},
			{
				body: {
					courseIds: data.courseIds,
					sessionId: sessionId || undefined, // Pass current session or let API create new one
				},
			}
		);
	};

	return (
		<div className="flex h-full w-full justify-center">
			{/* Main chat area - centered with max width */}
			<div className="flex flex-col w-full max-w-6xl">
				{/* Conversation area */}
				<div className="flex-1 overflow-hidden">
					<Conversation className="h-full">
						<ConversationContent className="space-y-4 max-w-5xl mx-auto px-4">
							{(isLoadingSession || isLoadingMessages) && (
								<div className="flex items-center justify-center py-8">
									<Loader />
									<span className="ml-2 text-muted-foreground">
										Loading session...
									</span>
								</div>
							)}

							{!(isLoadingSession || isLoadingMessages) &&
								messages.map((message) => {
									return (
										<Message key={message.id} from={message.role}>
											<MessageContent>
												{/* Render message parts */}
												{message.parts?.map((part, partIndex) => {
													switch (part.type) {
														case "text":
															return (
																<Response
																	key={`${message.id}-text-${partIndex}`}
																>
																	{part.text}
																</Response>
															);
														case "tool-call": {
															const toolName = extractToolName(part.type);
															return (
																<Tool key={`${message.id}-tool-${partIndex}`}>
																	<ToolHeader
																		type={getToolDisplayName(toolName)}
																		state={part.state}
																	/>
																	<ToolContent>
																		{part.state === "input-streaming" ||
																		part.state === "input-available" ? (
																			<ToolInput input={part.input} />
																		) : null}
																	</ToolContent>
																</Tool>
															);
														}
														default:
															return null;
													}
												})}
											</MessageContent>

											<Actions className="opacity-0 group-hover:opacity-100 transition-opacity">
												{/* Add copy button */}
											</Actions>
										</Message>
									);
								})}

							{status === "streaming" && (
								<Message from="assistant">
									<MessageContent>
										<Loader />
									</MessageContent>
								</Message>
							)}
						</ConversationContent>
						<ConversationScrollButton />
					</Conversation>
				</div>

				{/* Input area - sticky to bottom */}
				<div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t p-4">
					<div className="max-w-5xl mx-auto">
						<EnhancedPromptInput
							onSubmit={handleSubmit}
							onSessionSelect={handleSessionSelect}
							isLoading={status === "streaming"}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
