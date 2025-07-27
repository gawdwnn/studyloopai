"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

interface ReactQueryProviderProps {
	children: React.ReactNode;
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
	// Create QueryClient with stable reference
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 5 * 60 * 1000, // 5 minutes
						gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
						retry: (failureCount, error: unknown) => {
							/// More robust error checking
							const hasResponse = (
								err: unknown
							): err is { response: { status: number } } => {
								return !!(
									err &&
									typeof err === "object" &&
									"response" in err &&
									err.response &&
									typeof err.response === "object" &&
									"status" in err.response &&
									typeof err.response.status === "number"
								);
							};

							if (hasResponse(error)) {
								const status = error.response.status;
								if (status >= 400 && status < 500) {
									return false;
								}
							}
							return failureCount < 3;
						},
						refetchOnWindowFocus: false, // Disable refetch on window focus
						refetchOnReconnect: true,
					},
					mutations: {
						retry: false, // Don't retry mutations by default
					},
				},
			})
	);

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{/* Only show devtools in development */}
			{process.env.NODE_ENV === "development" && (
				<ReactQueryDevtools initialIsOpen={false} />
			)}
		</QueryClientProvider>
	);
}
