"use client";

/**
 * 다바르 — AI 자동 생성 (Gemini API 직접 호출).
 *
 * 본문·제목·주제가 정해지면 연구 → 개요 → 설교문을 자동으로 작성합니다.
 * 결과는 각 단계의 입력란에 채워지며, 목사님이 직접 다듬으실 수 있습니다.
 */

import { callGemini, parseJsonResponse } from "./gemini";
import type {
  Manuscripts,
  OutlineData,
  ResearchData,
  ToneKey,
} from "./types";
import { TONES } from "./types";

const SYSTEM = `당신은 한국 교회를 섬기는 목회자의 설교 준비를 돕는 연구 조수입니다.
- 모든 답변은 한국어로 작성합니다.
- 성경 본문 인용은 핵심 구절만 짧게 인용하고 장·절을 함께 적습니다. (긴 본문 전체 인용 금지)
- 목회자에게 실제 설교 준비에 도움이 되는 구체적이고 깊이 있는 내용을 제공합니다.
- 추측성 단언을 피하고, 학자들의 견해가 갈리는 부분은 그렇게 밝힙니다.`;

function researchPrompt(passage: string, title: string, theme: string): string {
  return `${SYSTEM}

다음 설교 본문을 연구해 주세요.
- 성경 본문: ${passage}
- 설교 제목: ${title || "(미정)"}
- 설교 주제/방향: ${theme || "(없음)"}

아래 5개 항목을 JSON으로 작성해 주세요. 각 항목은 4~8문장의 충실한 분량으로, 목회자가 설교 준비에 바로 쓸 수 있게 작성합니다.
{
  "background": "본문 배경 — 역사적·문화적 배경, 저자와 수신자 상황, 기록 목적",
  "originalLanguage": "원어 분석 — 히브리어·헬라어 핵심 단어 3~5개의 뜻과 용법 (음역과 함께)",
  "structure": "본문 구조 — 문학적 구조와 단락의 흐름",
  "themes": "신학적 주제 — 본문의 핵심 메시지와 신학적 의미 (설교 주제/방향과 연결)",
  "crossReferences": "교차 참조 — 관련된 성경 구절들과 각각이 본문 이해에 주는 도움"
}`;
}

function outlinePrompt(
  passage: string,
  title: string,
  theme: string,
  research: ResearchData
): string {
  const researchSummary = [
    `배경: ${research.background}`,
    `원어: ${research.originalLanguage}`,
    `구조: ${research.structure}`,
    `주제: ${research.themes}`,
    `교차참조: ${research.crossReferences}`,
  ].join("\n");
  return `${SYSTEM}

다음 설교의 개요(서론·본론·결론)를 작성해 주세요.
- 성경 본문: ${passage}
- 설교 제목: ${title || "(미정)"}
- 설교 주제/방향: ${theme || "(없음)"}

[연구 내용]
${researchSummary}

아래 형식의 JSON으로 작성해 주세요. 본론은 2~3개의 대지로 구성합니다.
{
  "intro": "서론 — 청중의 관심을 끄는 도입부 (4~8문장)",
  "bodyPoints": [
    { "title": "대지 1 제목", "content": "대지의 핵심 포인트, 성경 근거, 예화 방향 (4~8문장)" }
  ],
  "conclusion": "결론 — 적용과 결단으로 이끄는 마무리 (4~8문장)"
}`;
}

function manuscriptPrompt(
  passage: string,
  title: string,
  theme: string,
  outline: OutlineData,
  toneKey: ToneKey,
  styleSample: string
): string {
  const tone = TONES.find((t) => t.key === toneKey);
  const points = outline.bodyPoints
    .map((p, i) => `대지 ${i + 1} [${p.title}]\n${p.content}`)
    .join("\n\n");
  return `${SYSTEM}

다음 개요를 바탕으로 설교문 전체를 작성해 주세요.
- 성경 본문: ${passage}
- 설교 제목: ${title || passage}
- 설교 주제/방향: ${theme || "(없음)"}
- 어조: ${tone?.label} — ${tone?.description}

[확정된 개요]
서론:
${outline.intro}

본론:
${points}

결론:
${outline.conclusion}
${styleSample ? `\n[목사님의 문체 참고 — 이 리듬과 표현 방식을 살려 주세요]\n${styleSample}\n` : ""}
요청 사항:
- 위 개요의 흐름을 따라 서론·본론·결론 구조의 완성된 설교문으로 작성합니다.
- 어조(${tone?.label})에 맞게 작성합니다.
- 성경 구절은 핵심만 짧게 인용하고 장·절을 밝힙니다.
- 분량은 30분 설교 기준(약 6,000자 내외)으로 작성합니다.
- plain text로 작성합니다. (특수 표식 없이 자연스러운 설교문)`;
}

/** 본문 연구 자동 생성 */
export async function generateResearch(
  passage: string,
  title: string,
  theme: string
): Promise<ResearchData> {
  const text = await callGemini(researchPrompt(passage, title, theme), {
    json: true,
  });
  const data = parseJsonResponse<ResearchData>(text);
  return {
    background: data.background ?? "",
    originalLanguage: data.originalLanguage ?? "",
    structure: data.structure ?? "",
    themes: data.themes ?? "",
    crossReferences: data.crossReferences ?? "",
  };
}

/** 설교 개요 자동 생성 */
export async function generateOutline(
  passage: string,
  title: string,
  theme: string,
  research: ResearchData
): Promise<OutlineData> {
  const text = await callGemini(
    outlinePrompt(passage, title, theme, research),
    { json: true }
  );
  const data = parseJsonResponse<{
    intro: string;
    bodyPoints: { title: string; content: string }[];
    conclusion: string;
  }>(text);
  return {
    intro: data.intro ?? "",
    bodyPoints: (data.bodyPoints ?? []).map((p) => ({
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: p.title ?? "",
      content: p.content ?? "",
    })),
    conclusion: data.conclusion ?? "",
  };
}

/** 선택한 어조들의 설교문 자동 생성 */
export async function generateManuscripts(
  passage: string,
  title: string,
  theme: string,
  outline: OutlineData,
  tones: ToneKey[],
  styleSample: string
): Promise<Partial<Manuscripts>> {
  const result: Partial<Manuscripts> = {};
  for (const toneKey of tones) {
    const text = await callGemini(
      manuscriptPrompt(passage, title, theme, outline, toneKey, styleSample)
    );
    result[toneKey] = text.trim();
  }
  return result;
}
