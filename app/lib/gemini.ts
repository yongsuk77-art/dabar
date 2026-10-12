"use client";

/**
 * 다바르 — 브라우저에서 직접 호출하는 Gemini API 클라이언트.
 *
 * 정적 배포(Cloudflare Pages)라 서버가 없으므로, 목사님이 AI Studio에서
 * 발급받은 API 키를 브라우저 localStorage에 저장하고 직접 호출합니다.
 * 키는 이 브라우저를 떠나지 않으며, 구글 API로만 전송됩니다.
 */

export const GEMINI_MODEL = "gemini-flash-latest";
export const AI_STUDIO_KEY_URL = "https://aistudio.google.com/apikey";
const STORAGE_KEY = "dabar_gemini_api_key";

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setApiKey(key: string): void {
  if (typeof window === "undefined") return;
  const v = key.trim();
  if (v) localStorage.setItem(STORAGE_KEY, v);
  else localStorage.removeItem(STORAGE_KEY);
}

export function clearApiKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export class AiKeyMissingError extends Error {
  constructor() {
    super("AI_API_KEY_MISSING");
    this.name = "AiKeyMissingError";
  }
}

interface CallOptions {
  system?: string;
  /** true면 JSON 모드로 응답을 강제합니다 */
  json?: boolean;
}

/** Gemini generateContent 호출 → 생성된 텍스트 반환 */
export async function callGemini(
  prompt: string,
  opts: CallOptions = {}
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new AiKeyMissingError();

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}` +
    `:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (opts.system) {
    body.system_instruction = { parts: [{ text: opts.system }] };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Gemini API에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요."
    );
  }

  if (!res.ok) {
    if (res.status === 400 || res.status === 403) {
      throw new Error(
        "API 키가 유효하지 않습니다. AI Studio에서 발급받은 키를 다시 확인해 주세요."
      );
    }
    if (res.status === 429) {
      throw new Error(
        "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
      );
    }
    throw new Error(`Gemini API 오류 (HTTP ${res.status}). 잠시 후 다시 시도해 주세요.`);
  }

  const data = await res.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("AI 응답을 받지 못했습니다. 다시 시도해 주세요.");
  return text;
}

/** JSON 모드 응답 파싱 (마크다운 펜스 제거 후 파싱) */
export function parseJsonResponse<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
