"use client";

import Link from "next/link";
import { ToggleGroup } from "radix-ui";
import { usePathname } from "next/navigation";

export function ModeSwitch({ tab }: { tab: string }) {
  const pathname = usePathname();
  const mode = pathname.startsWith("/analytics/") ? "analytic" : "tv";
  return (
    <ToggleGroup.Root className="mode-switch" type="single" value={mode} aria-label="Mode tampilan">
      <ToggleGroup.Item className="mode-option" value="tv" aria-label="Mode TV" asChild><Link href={`/tv/${tab}`}>TV</Link></ToggleGroup.Item>
      <ToggleGroup.Item className="mode-option" value="analytic" aria-label="Mode Analitik" asChild><Link href={`/analytics/${tab}`}>Analitik</Link></ToggleGroup.Item>
    </ToggleGroup.Root>
  );
}
