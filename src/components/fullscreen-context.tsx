"use client";

import { logger } from "@/lib/utils/logger";
import { createContext, useContext, useEffect, useState } from "react";
import screenfull from "screenfull";

interface FullscreenContextType {
	isFullscreen: boolean;
	isSupported: boolean;
	toggleFullscreen: () => Promise<void>;
	enterFullscreen: () => Promise<void>;
	exitFullscreen: () => Promise<void>;
}

const FullscreenContext = createContext<FullscreenContextType | undefined>(
	undefined
);

interface FullscreenProviderProps {
	children: React.ReactNode;
}

export function FullscreenProvider({ children }: FullscreenProviderProps) {
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isSupported] = useState(screenfull.isEnabled);

	useEffect(() => {
		if (!screenfull.isEnabled) return;

		const handleFullscreenChange = () => {
			setIsFullscreen(screenfull.isFullscreen);
		};

		screenfull.on("change", handleFullscreenChange);
		screenfull.on("error", (event) => {
			logger.error("Fullscreen API error occurred", {
				event: String(event),
				isFullscreen: screenfull.isFullscreen,
				isEnabled: screenfull.isEnabled,
			});
		});

		// Set initial state
		setIsFullscreen(screenfull.isFullscreen);

		return () => {
			screenfull.off("change", handleFullscreenChange);
		};
	}, []);

	const toggleFullscreen = async (): Promise<void> => {
		if (!screenfull.isEnabled) return;

		try {
			await screenfull.toggle();
		} catch (error) {
			logger.error("Failed to toggle fullscreen mode", {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				isFullscreen: screenfull.isFullscreen,
				isEnabled: screenfull.isEnabled,
			});
		}
	};

	const enterFullscreen = async (): Promise<void> => {
		if (!screenfull.isEnabled || screenfull.isFullscreen) return;

		try {
			await screenfull.request();
		} catch (error) {
			logger.error("Failed to enter fullscreen mode", {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				isFullscreen: screenfull.isFullscreen,
				isEnabled: screenfull.isEnabled,
			});
		}
	};

	const exitFullscreen = async (): Promise<void> => {
		if (!screenfull.isEnabled || !screenfull.isFullscreen) return;

		try {
			await screenfull.exit();
		} catch (error) {
			logger.error("Failed to exit fullscreen mode", {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				isFullscreen: screenfull.isFullscreen,
				isEnabled: screenfull.isEnabled,
			});
		}
	};

	const value: FullscreenContextType = {
		isFullscreen,
		isSupported,
		toggleFullscreen,
		enterFullscreen,
		exitFullscreen,
	};

	return (
		<FullscreenContext.Provider value={value}>
			{children}
		</FullscreenContext.Provider>
	);
}

export function useFullscreen(): FullscreenContextType {
	const context = useContext(FullscreenContext);

	if (context === undefined) {
		throw new Error("useFullscreen must be used within a FullscreenProvider");
	}

	return context;
}
