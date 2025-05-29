"use client";

import { usePathname, useRouter } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TabNavProps {
  tabs: {
    label: string;
    href: string;
  }[];
}

export function AppTabNav({ tabs }: TabNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Tabs
      value={pathname}
      onValueChange={(value) => router.push(value)}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.href} value={tab.href}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
