import {
	getChatMessages,
	getChatSession,
	getUserChatSessions,
} from "@/lib/actions/chat";
import { useQuery } from "@tanstack/react-query";

export const useChatSessions = () => {
	return useQuery({
		queryKey: ["chat-sessions"],
		queryFn: getUserChatSessions,
		refetchInterval: 30000, // Refresh every 30 seconds
	});
};

export const useChatSession = (sessionId: string | null) => {
	return useQuery({
		queryKey: ["chat-session", sessionId],
		queryFn: () => getChatSession(sessionId as string),
		enabled: !!sessionId,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};

export const useChatMessages = (sessionId: string | null) => {
	return useQuery({
		queryKey: ["chat-messages", sessionId],
		queryFn: () => getChatMessages(sessionId as string),
		enabled: !!sessionId,
		staleTime: 1 * 60 * 1000, // 1 minute (messages change more frequently)
	});
};
