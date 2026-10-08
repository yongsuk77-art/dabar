/** 다바르 — 브라우저 로컬 스토리지 기반 저장소 */

import type { Sermon, StyleSample } from "./types";
import { emptyManuscripts, emptyOutline, emptyResearch } from "./types";

const SERMONS_KEY = "dabar.sermons.v1";
const SAMPLES_KEY = "dabar.styleSamples.v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 용량 초과 등은 조용히 무시
  }
}

/* ---------- 설교 ---------- */

/** 구버전 저장 데이터에 새 필드(주제/컨펌/어조선택)를 채워 줌 */
function migrateSermon(s: Partial<Sermon>): Sermon {
  const now = new Date().toISOString();
  return {
    id: s.id ?? `sermon-${Date.now()}`,
    title: s.title ?? "",
    passage: s.passage ?? "",
    theme: s.theme ?? "",
    createdAt: s.createdAt ?? now,
    updatedAt: s.updatedAt ?? now,
    research: { ...emptyResearch(), ...(s.research ?? {}) },
    outline: { ...emptyOutline(), ...(s.outline ?? {}) },
    outlineConfirmed: s.outlineConfirmed ?? false,
    outlineConfirmedAt: s.outlineConfirmedAt ?? null,
    selectedTones: Array.isArray(s.selectedTones) ? s.selectedTones : [],
    manuscripts: { ...emptyManuscripts(), ...(s.manuscripts ?? {}) },
  };
}

export function loadSermons(): Sermon[] {
  const list = read<Partial<Sermon>[]>(SERMONS_KEY, []).map(migrateSermon);
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function loadSermon(id: string): Sermon | null {
  return loadSermons().find((s) => s.id === id) ?? null;
}

export function saveSermon(sermon: Sermon): void {
  const list = read<Partial<Sermon>[]>(SERMONS_KEY, []);
  const idx = list.findIndex((s) => s.id === sermon.id);
  const next = { ...sermon, updatedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  write(SERMONS_KEY, list);
}

export function deleteSermon(id: string): void {
  write(
    SERMONS_KEY,
    read<Partial<Sermon>[]>(SERMONS_KEY, []).filter((s) => s.id !== id)
  );
}

/* ---------- 스타일 학습 샘플 ---------- */

export function loadStyleSamples(): StyleSample[] {
  const list = read<StyleSample[]>(SAMPLES_KEY, []);
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveStyleSample(sample: StyleSample): void {
  const list = read<StyleSample[]>(SAMPLES_KEY, []);
  const idx = list.findIndex((s) => s.id === sample.id);
  if (idx >= 0) list[idx] = sample;
  else list.push(sample);
  write(SAMPLES_KEY, list);
}

export function deleteStyleSample(id: string): void {
  write(
    SAMPLES_KEY,
    read<StyleSample[]>(SAMPLES_KEY, []).filter((s) => s.id !== id)
  );
}

/** JSON 파일로 내보내기 (백업용) */
export function exportBackup(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      sermons: read<Sermon[]>(SERMONS_KEY, []),
      styleSamples: read<StyleSample[]>(SAMPLES_KEY, []),
    },
    null,
    2
  );
}
