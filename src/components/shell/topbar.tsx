"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Tabs } from "radix-ui";
import { Factory, LayoutGrid } from "lucide-react";
import { tabs, getTab } from "@/config/tabs";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { ModeSwitch } from "@/components/shell/mode-switch";
import { UserMenu } from "@/components/shell/user-menu";
import { TvSettings } from "@/components/tv/tv-settings";
import type { TvLayoutProfileSummary } from "@/features/layout/store";

const PROFILE_STORAGE_KEY = "nexus-tv-layout-profile";

export function Topbar({
  mode, name, email, isAdmin = false, profiles = []
}: {
  mode: "tv" | "analytic";
  name?: string | null;
  email: string;
  isAdmin?: boolean;
  profiles?: TvLayoutProfileSummary[] | null;
}) {
  const params = useParams<{ tab?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const subscribeProfile = useCallback((onChange: () => void) => {
    window.addEventListener("popstate", onChange);
    window.addEventListener("nexus-profile-change", onChange);
    return () => {
      window.removeEventListener("popstate", onChange);
      window.removeEventListener("nexus-profile-change", onChange);
    };
  }, []);
  const getProfileSnapshot = useCallback(() => {
    const urlId = new URL(window.location.href).searchParams.get("profileId") ?? "";
    const storedId = window.localStorage.getItem(PROFILE_STORAGE_KEY) ?? "";
    if (!profiles) return urlId || storedId;
    return [urlId, storedId].find((candidate) => profiles.some((profile) => String(profile.id) === candidate)) ?? "";
  }, [profiles]);
  const profileId = useSyncExternalStore(subscribeProfile, getProfileSnapshot, () => "");
  const activeTab = getTab(params.tab ?? "")?.slug ?? tabs[0]!.slug;
  const base = mode === "tv" ? "/tv" : "/analytics";
  useEffect(() => {
    if (mode !== "tv") return;
    if (!profiles) return;
    const url = new URL(window.location.href);
    const queryId = url.searchParams.get("profileId") ?? "";
    const storedId = window.localStorage.getItem(PROFILE_STORAGE_KEY) ?? "";
    const selected = [queryId, storedId].find((candidate) => profiles.some((profile) => String(profile.id) === candidate)) ?? "";
    if (selected) window.localStorage.setItem(PROFILE_STORAGE_KEY, selected);
    else window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    if (queryId !== selected) {
      if (selected) url.searchParams.set("profileId", selected);
      else url.searchParams.delete("profileId");
      router.replace(`${pathname}${url.search}`);
    }
    window.dispatchEvent(new Event("nexus-profile-change"));
  }, [mode, pathname, profiles, router]);
  function chooseProfile(value: string) {
    if (value) window.localStorage.setItem(PROFILE_STORAGE_KEY, value);
    else window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("profileId", value);
    else url.searchParams.delete("profileId");
    router.replace(`${pathname}${url.search}`);
    window.dispatchEvent(new Event("nexus-profile-change"));
  }
  function tabHref(slug: string) {
    return `${base}/${slug}${mode === "tv" && profileId ? `?profileId=${profileId}` : ""}`;
  }
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
                <Link href={tabHref(tab.slug)}><Icon size={16} /><span>{tab.label}</span></Link>
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>
      </Tabs.Root>
      <div className="topbar-actions">
        {mode === "tv" && (
          <label className="tv-profile-select">
            <span className="sr-only">Preset layout TV</span>
            <select aria-label="Preset layout TV" value={profileId} onChange={(event) => chooseProfile(event.target.value)}>
              <option value="">Layout default</option>
              {profileId && !profiles?.some((profile) => String(profile.id) === profileId) && <option value={profileId}>Preset tersimpan</option>}
              {profiles?.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
          </label>
        )}
        <ModeSwitch tab={activeTab} />
        <ThemeToggle />
        {mode === "tv" && isAdmin && (
          <>
            <Link href="/tv/layout-profiles" className="topbar-edit-layout" title="Kelola preset layout"><LayoutGrid size={14} /><span>Preset layout</span></Link>
            <Link href={`/tv/layout/${activeTab}${profileId ? `?profileId=${profileId}` : ""}`} className="topbar-edit-layout" title="Edit susunan slide dan widget"><LayoutGrid size={14} /><span>Edit layout</span></Link>
          </>
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
