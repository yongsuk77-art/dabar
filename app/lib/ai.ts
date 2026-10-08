/**
 * 다바르 — 향후 AI 연동을 위한 자리 표시자 모듈.
 *
 * 현재 버전에서는 AI 자동 생성을 제공하지 않습니다.
 * 목사님이 아벨(채팅)과 대화하며 받은 연구/개요/설교문 결과를
 * 앱의 각 단계에 복사해서 붙여넣는 방식으로 사용합니다.
 *
 * 나중에 서버 API(예: /api/generate)가 연결되면 아래 함수들의
 * 내부 구현만 교체하면 됩니다. UI 쪽 인터페이스는 그대로 유지됩니다.
 */

import type { Manuscripts, OutlineData, ResearchData } from "./types";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI 연동이 아직 설정되지 않았습니다. 아벨과의 채팅에서 받은 결과를 복사해서 붙여넣어 주세요.");
    this.name = "AiNotConfiguredError";
  }
}

/** 본문 연구 자동 생성 (미구현) */
export async function generateResearch(_passage: string): Promise<ResearchData> {
  throw new AiNotConfiguredError();
}

/** 설교 개요 자동 생성 (미구현) */
export async function generateOutline(
  _passage: string,
  _research: ResearchData
): Promise<OutlineData> {
  throw new AiNotConfiguredError();
}

/** 3가지 어조 설교문 자동 생성 (미구현) */
export async function generateManuscripts(
  _passage: string,
  _outline: OutlineData
): Promise<Manuscripts> {
  throw new AiNotConfiguredError();
}
