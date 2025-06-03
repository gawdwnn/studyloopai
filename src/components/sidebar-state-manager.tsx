"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { useEffect } from "react";

export function SidebarStateManager() {
  const { open } = useSidebar();

  useEffect(() => {
    document.cookie = `sidebar-state=${open}; path=/; max-age=${
      60 * 60 * 24 * 30
    }`;
  }, [open]);

  return null;
}
