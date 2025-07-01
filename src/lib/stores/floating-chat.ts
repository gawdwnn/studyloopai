import { create } from "zustand";

interface FloatingChatState {
	isOpen: boolean;
	isMinimized: boolean;
	toggle: () => void;
	open: () => void;
	close: () => void;
	toggleMinimize: () => void;
	minimize: () => void;
	maximize: () => void;
}

export const useFloatingChat = create<FloatingChatState>((set) => ({
	isOpen: false,
	isMinimized: false,
	toggle: () => set((state) => ({ isOpen: !state.isOpen })),
	open: () => set({ isOpen: true }),
	close: () => set({ isOpen: false }),
	toggleMinimize: () => set((state) => ({ isMinimized: !state.isMinimized })),
	minimize: () => set({ isMinimized: true }),
	maximize: () => set({ isMinimized: false }),
}));
