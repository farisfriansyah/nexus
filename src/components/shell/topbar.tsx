"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Tabs } from "radix-ui";
import { Factory, LayoutGrid } from "lucide-react";
import { tabs, getTab } from "@/config/tabs";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { ModeSwitch } from "@/components/shell/mode-switch";
import { UserMenu } from "@/components/shell/user-menu";
import { TvSettings } from "@/components/tv/tv-settings";

export function Topbar({
  mode, name, email, isAdmin = false
}: {
  mode: "tv" | "analytic";
  name?: string | null;
  email: string;
  isAdmin?: boolean;
}) {
  const params = useParams<{ tab?: string }>();
  const activeTab = getTab(params.tab ?? "")?.slug ?? tabs[0]!.slug;
  const base = mode === "tv" ? "/tv" : "/analytics";
  return (
    <header className={`topbar ${mode === "tv" ? "topbar-tv" : ""}`}>
      <Link href={`/tv/${activeTab}`} className="topbar-brand" aria-label="Nexus dashboard">
        <span className="topbar-logo"><Factory size={18} /></span><span>Nexus</span>
      </Link>
      <Tabs.Root value={activeTab} className="tab-root" orientation="horizontal">
        <Tabs.List className="tab-list" aria-label="Area dashboard">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tabs.Trigger key={tab.id} value={tab.slug} className="tab-trigger" asChild>
                <Link href={`${base}/${tab.slug}`}><Icon size={16} /><span>{tab.label}</span></Link>
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>
      </Tabs.Root>
      <div className="topbar-actions">
        <ModeSwitch tab={activeTab} />
        <ThemeToggle />
        {mode === "tv" && isAdmin && (
          <Link href={`/tv/layout/${activeTab}`} className="topbar-edit-layout" title="Edit susunan slide dan widget"><LayoutGrid size={14} /><span>Edit layout</span></Link>
        )}
        {mode === "tv" && (
          <TvSettings tab={activeTab} />
        )}
        {mode === "analytic" && <UserMenu name={name} email={email} />}
        {mode === "tv" && <UserMenu name={name} email={email} />}
      </div>
    </header>
  );
}
