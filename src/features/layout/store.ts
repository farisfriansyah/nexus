import { tvLayouts } from "@/config/layouts/seed";
import { tabs } from "@/config/tabs";
import { getDb } from "@/lib/db";
import { packSlide } from "@/features/layout/resolver";
import { tabLayoutSchema, type TabLayout } from "@/features/layout/schema";
import type { Prisma } from "@/generated/prisma/client";

export type LayoutSource = "default" | "published" | "draft";
export type LoadedLayout = { layout: TabLayout; source: LayoutSource; version: number | null };
export type TvLayoutProfileSummary = { id: number; name: string };
export type TvLayoutProfile = TvLayoutProfileSummary & { layouts: Prisma.JsonValue };

export async function listTvLayoutProfiles(): Promise<TvLayoutProfileSummary[]> {
  return getDb().tvLayoutProfile.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });
}

export async function getTvLayoutProfile(id: number): Promise<TvLayoutProfile | null> {
  return getDb().tvLayoutProfile.findUnique({
    where: { id },
    select: { id: true, name: true, layouts: true }
  });
}

export function getLayoutFromProfile(profile: TvLayoutProfile, tab: string): TabLayout | null {
  if (typeof profile.layouts !== "object" || profile.layouts === null || Array.isArray(profile.layouts)) return null;
  const layout = profile.layouts[tab];
  if (layout === undefined) return null;
  const checked = validateLayout(layout, tab);
  return checked.ok ? checked.layout : null;
}

export async function createTvLayoutProfile(name: string, user: string | null): Promise<TvLayoutProfileSummary> {
  const layouts = Object.fromEntries(await Promise.all(tabs.map(async ({ slug }) => {
    const loaded = await getPublishedLayout(slug);
    const layout = loaded?.layout ?? tvLayouts[slug];
    if (!layout) throw new Error(`Layout bawaan tidak ditemukan untuk tab "${slug}"`);
    return [slug, layout];
  })));
  return getDb().tvLayoutProfile.create({
    data: { name, createdBy: user, layouts: layouts as Prisma.InputJsonValue },
    select: { id: true, name: true }
  });
}

export async function renameTvLayoutProfile(id: number, name: string): Promise<TvLayoutProfileSummary | null> {
  const existing = await getDb().tvLayoutProfile.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  return getDb().tvLayoutProfile.update({
    where: { id },
    data: { name },
    select: { id: true, name: true }
  });
}

export async function saveProfileTabLayout(id: number, tab: string, layout: TabLayout): Promise<boolean> {
  const db = getDb();
  const profile = await db.tvLayoutProfile.findUnique({ where: { id }, select: { layouts: true } });
  if (!profile) return false;
  if (typeof profile.layouts !== "object" || profile.layouts === null || Array.isArray(profile.layouts)) {
    throw new Error(`Profil layout ${id} memiliki format layout yang tidak valid`);
  }
  await db.tvLayoutProfile.update({
    where: { id },
    data: {
      layouts: { ...profile.layouts, [tab]: layout } as Prisma.InputJsonValue
    }
  });
  return true;
}

export async function deleteTvLayoutProfile(id: number): Promise<boolean> {
  const result = await getDb().tvLayoutProfile.deleteMany({ where: { id } });
  return result.count > 0;
}

/** Menolak layout yang widget-nya tidak muat pada grid slide (agar tidak terpotong di TV). */
export function validateLayout(input: unknown, tab: string): { ok: true; layout: TabLayout } | { ok: false; error: string } {
  const parsed = tabLayoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Layout tidak valid" };
  if (parsed.data.tab !== tab) return { ok: false, error: "Tab tidak sesuai" };
  for (const slide of parsed.data.slides) {
    const { overflow } = packSlide(slide.items, slide.rows);
    if (overflow.length) return { ok: false, error: `Slide "${slide.title}": ${overflow.length} widget tidak muat` };
  }
  return { ok: true, layout: parsed.data };
}

function defaultLayout(tab: string): LoadedLayout | null {
  const layout = tvLayouts[tab];
  return layout ? { layout, source: "default", version: null } : null;
}

async function latest(tab: string, status: "draft" | "published") {
  const row = await getDb().layoutVersion.findFirst({ where: { tab, status }, orderBy: { version: "desc" } });
  if (!row) return null;
  const checked = validateLayout(row.data, tab);
  return checked.ok ? { layout: checked.layout, version: row.version } : null;
}

/** Layout yang ditampilkan TV/Analitik: versi terbit terbaru, jatuh ke seed bila DB kosong/tidak terjangkau. */
export async function getPublishedLayout(tab: string): Promise<LoadedLayout | null> {
  try {
    const row = await latest(tab, "published");
    if (row) return { ...row, source: "published" };
  } catch (error) {
    console.error("[layout] DB tidak terjangkau, memakai layout default", error);
  }
  return defaultLayout(tab);
}

/** Layout untuk editor: draft terbaru bila lebih baru dari versi terbit, lalu terbit, lalu default. */
export async function getEditableLayout(tab: string): Promise<LoadedLayout | null> {
  const draft = await latest(tab, "draft");
  const published = await latest(tab, "published");
  if (draft && (!published || draft.version > published.version)) return { ...draft, source: "draft" };
  if (published) return { ...published, source: "published" };
  return defaultLayout(tab);
}

async function nextVersion(tab: string): Promise<number> {
  const top = await getDb().layoutVersion.findFirst({ where: { tab }, orderBy: { version: "desc" }, select: { version: true } });
  return (top?.version ?? 0) + 1;
}

export async function saveDraft(tab: string, layout: TabLayout, user: string | null): Promise<number> {
  const db = getDb();
  const existing = await db.layoutVersion.findFirst({ where: { tab, status: "draft" }, orderBy: { version: "desc" } });
  const published = await latest(tab, "published");
  if (existing && (!published || existing.version > published.version)) {
    await db.layoutVersion.update({ where: { id: existing.id }, data: { data: layout, createdBy: user } });
    return existing.version;
  }
  const version = await nextVersion(tab);
  await db.layoutVersion.create({ data: { tab, version, status: "draft", data: layout, createdBy: user } });
  return version;
}

/** Menerbitkan draft terbaru; versi terbit lama tetap tersimpan sebagai riwayat. */
export async function publishDraft(tab: string): Promise<number | null> {
  const db = getDb();
  const draft = await db.layoutVersion.findFirst({ where: { tab, status: "draft" }, orderBy: { version: "desc" } });
  if (!draft) return null;
  await db.layoutVersion.update({ where: { id: draft.id }, data: { status: "published", publishedAt: new Date() } });
  return draft.version;
}

/** Kembali ke seed bawaan: hapus semua versi tab ini. */
export async function resetLayout(tab: string): Promise<void> {
  await getDb().layoutVersion.deleteMany({ where: { tab } });
}
