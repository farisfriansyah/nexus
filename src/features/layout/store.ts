import { tvLayouts } from "@/config/layouts/seed";
import { tabs } from "@/config/tabs";
import { getDb } from "@/lib/db";
import { packSlide } from "@/features/layout/resolver";
import { tabLayoutSchema, type TabLayout } from "@/features/layout/schema";
import type { Prisma } from "@/generated/prisma/client";
import { writeAudit } from "@/lib/audit";

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
  return getDb().$transaction(async (tx) => {
    const profile = await tx.tvLayoutProfile.create({
      data: { name, createdBy: user, layouts: layouts as Prisma.InputJsonValue },
      select: { id: true, name: true }
    });
    await writeAudit(tx, { action: "profile.create", actor: user, target: String(profile.id), details: { name } });
    return profile;
  });
}

export async function renameTvLayoutProfile(id: number, name: string, user: string | null): Promise<TvLayoutProfileSummary | null> {
  return getDb().$transaction(async (tx) => {
    const existing = await tx.tvLayoutProfile.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!existing) return null;
    const profile = await tx.tvLayoutProfile.update({ where: { id }, data: { name }, select: { id: true, name: true } });
    await writeAudit(tx, { action: "profile.rename", actor: user, target: String(id), details: { before: existing.name, after: name } });
    return profile;
  });
}

export async function saveProfileTabLayout(id: number, tab: string, layout: TabLayout, user: string | null): Promise<boolean> {
  return getDb().$transaction(async (tx) => {
    const profile = await tx.tvLayoutProfile.findUnique({ where: { id }, select: { layouts: true } });
    if (!profile) return false;
    if (typeof profile.layouts !== "object" || profile.layouts === null || Array.isArray(profile.layouts)) {
      throw new Error(`Profil layout ${id} memiliki format layout yang tidak valid`);
    }
    await tx.tvLayoutProfile.update({ where: { id }, data: {
      layouts: { ...profile.layouts, [tab]: layout } as Prisma.InputJsonValue
    } });
    await writeAudit(tx, { action: "profile.layout.save", actor: user, target: String(id), details: { tab } });
    return true;
  });
}

export async function deleteTvLayoutProfile(id: number, user: string | null): Promise<boolean> {
  return getDb().$transaction(async (tx) => {
    const result = await tx.tvLayoutProfile.deleteMany({ where: { id } });
    if (!result.count) return false;
    await writeAudit(tx, { action: "profile.delete", actor: user, target: String(id) });
    return true;
  });
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

async function latest(tab: string, status: "draft" | "published", db: Prisma.TransactionClient = getDb()) {
  const row = await db.layoutVersion.findFirst({ where: { tab, status }, orderBy: { version: "desc" } });
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

async function nextVersion(tab: string, db: Prisma.TransactionClient): Promise<number> {
  const top = await db.layoutVersion.findFirst({ where: { tab }, orderBy: { version: "desc" }, select: { version: true } });
  return (top?.version ?? 0) + 1;
}

export async function saveDraft(tab: string, layout: TabLayout, user: string | null): Promise<number> {
  return getDb().$transaction(async (db) => {
    const existing = await db.layoutVersion.findFirst({ where: { tab, status: "draft" }, orderBy: { version: "desc" } });
    const published = await latest(tab, "published", db);
    let version: number;
    if (existing && (!published || existing.version > published.version)) {
      await db.layoutVersion.update({ where: { id: existing.id }, data: { data: layout, createdBy: user } });
      version = existing.version;
    } else {
      version = await nextVersion(tab, db);
      await db.layoutVersion.create({ data: { tab, version, status: "draft", data: layout, createdBy: user } });
    }
    await writeAudit(db, { action: "layout.save", actor: user, target: tab, details: { version } });
    return version;
  });
}

/** Menerbitkan draft terbaru; versi terbit lama tetap tersimpan sebagai riwayat. */
export async function publishDraft(tab: string, user: string | null): Promise<number | null> {
  return getDb().$transaction(async (db) => {
    const draft = await db.layoutVersion.findFirst({ where: { tab, status: "draft" }, orderBy: { version: "desc" } });
    if (!draft) return null;
    await db.layoutVersion.update({ where: { id: draft.id }, data: { status: "published", publishedAt: new Date() } });
    await writeAudit(db, { action: "layout.publish", actor: user, target: tab, details: { version: draft.version } });
    return draft.version;
  });
}

/** Kembali ke seed bawaan: hapus semua versi tab ini. */
export async function resetLayout(tab: string, user: string | null): Promise<void> {
  await getDb().$transaction(async (db) => {
    const deleted = await db.layoutVersion.deleteMany({ where: { tab } });
    await writeAudit(db, { action: "layout.reset", actor: user, target: tab, details: { deleted: deleted.count } });
  });
}
