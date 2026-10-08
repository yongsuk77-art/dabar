/** 다바르 설교 준비 앱 — 데이터 타입 정의 */

/** 연구 단계 데이터 (5개 섹션) */
export interface ResearchData {
  /** 본문 배경 (역사적·문화적 배경) */
  background: string;
  /** 원어 분석 (히브리어/헬라어 핵심 단어) */
  originalLanguage: string;
  /** 본문 구조 (문학적 구조) */
  structure: string;
  /** 신학적 주제 */
  themes: string;
  /** 교차 참조 (관련 성경 구절) */
  crossReferences: string;
}

export const emptyResearch = (): ResearchData => ({
  background: "",
  originalLanguage: "",
  structure: "",
  themes: "",
  crossReferences: "",
});

/** 개요의 본론 대지 하나 */
export interface OutlinePoint {
  id: string;
  title: string;
  content: string;
}

/** 개요 단계 데이터 */
export interface OutlineData {
  intro: string;
  bodyPoints: OutlinePoint[];
  conclusion: string;
}

export const emptyOutline = (): OutlineData => ({
  intro: "",
  bodyPoints: [],
  conclusion: "",
});

/** 설교문 3가지 어조 */
export type ToneKey = "gentle" | "strong" | "healing";

export const TONES: { key: ToneKey; label: string; description: string }[] = [
  {
    key: "gentle",
    label: "친절한 설명형",
    description: "박동찬 목사님 스타일 — 따뜻하고 이해하기 쉽게 설명",
  },
  {
    key: "strong",
    label: "강한 설득형",
    description: "젠센 프랭클린 목사님 스타일 — 도전적이고 결단을 촉구",
  },
  {
    key: "healing",
    label: "위로와 치유형",
    description: "상한 마음을 어루만지고 회복을 선포",
  },
];

export interface Manuscripts {
  gentle: string;
  strong: string;
  healing: string;
}

export const emptyManuscripts = (): Manuscripts => ({
  gentle: "",
  strong: "",
  healing: "",
});

/** 설교 하나 */
export interface Sermon {
  id: string;
  title: string;
  passage: string;
  /** 설교 주제/방향 (선택사항 — 본문과 함께 입력 가능) */
  theme: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  research: ResearchData;
  outline: OutlineData;
  /** 개요 최종 컨펌 여부 (목사님이 직접 확정) */
  outlineConfirmed: boolean;
  outlineConfirmedAt: string | null; // ISO
  /** 선택한 설교 어조 (복수 선택 가능) */
  selectedTones: ToneKey[];
  manuscripts: Manuscripts;
}

/** 목사님 어조 학습용 기존 설교 원고 샘플 */
export interface StyleSample {
  id: string;
  title: string;
  content: string;
  createdAt: string; // ISO
}

export const newSermon = (
  title: string,
  passage: string,
  theme: string = ""
): Sermon => {
  const now = new Date().toISOString();
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sermon-${Date.now()}`,
    title: title.trim() || passage.trim() || "제목 없음",
    passage: passage.trim(),
    theme: theme.trim(),
    createdAt: now,
    updatedAt: now,
    research: emptyResearch(),
    outline: emptyOutline(),
    outlineConfirmed: false,
    outlineConfirmedAt: null,
    selectedTones: [],
    manuscripts: emptyManuscripts(),
  };
};
