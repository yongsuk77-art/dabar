"use client";

/**
 * 다바르 — 선택된 AI 제공자를 브라우저에서 직접 호출합니다.
 * (정적 배포라 서버가 없으므로, 키는 목사님 브라우저에서 각 API로 직접 전송됩니다)
 */

import {
  ProviderId,
  getProvider,
  getProviderDef,
  getProviderKey,
  getProviderModel,
} from "./providers";

export class AiKeyMissingError extends Error {
  constructor() {
    super("AI_API_KEY_MISSING");
    this.name = "AiKeyMissingError";
  }
}

interface CallOptions {
  system?: string;
  /** true면 JSON 응답을 요청합니다 */
  json?: boolean;
}

const JSON_SUFFIX =
  "\n\n반드시 순수 JSON으로만 응답하세요. 마크다운 코드펜스나 설명 문장을 붙이지 마세요.";

async function readError(res: Response, provider: string): Promise<Error> {
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    return new Error(
      `${provider} API 키가 유효하지 않습니다. 키를 다시 확인해 주세요.`
    );
  }
  if (res.status === 429) {
    return new Error("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
  }
  return new Error(
    `${provider} API 오류 (HTTP ${res.status}). 잠시 후 다시 시도해 주세요.`
  );
}

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  opts: CallOptions
): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}` +
    `:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (opts.system) body.system_instruction = { parts: [{ text: opts.system }] };
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Gemini API에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.");
  }
  if (!res.ok) throw await readError(res, "Gemini");
  const data = await res.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("AI 응답을 받지 못했습니다. 다시 시도해 주세요.");
  return text;
}

async function callOpenAi(
  apiKey: string,
  model: string,
  prompt: string,
  opts: CallOptions
): Promise<string> {
  const messages: { role: string; content: string }[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({
    role: "user",
    content: opts.json ? prompt + JSON_SUFFIX : prompt,
  });
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 8192,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
  } catch {
    throw new Error("OpenAI API에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.");
  }
  if (!res.ok) throw await readError(res, "OpenAI");
  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("AI 응답을 받지 못했습니다. 다시 시도해 주세요.");
  return text;
}

async function callClaude(
  apiKey: string,
  model: string,
  prompt: string,
  opts: CallOptions
): Promise<string> {
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        ...(opts.system ? { system: opts.system } : {}),
        messages: [
          {
            role: "user",
            content: opts.json ? prompt + JSON_SUFFIX : prompt,
          },
        ],
      }),
    });
  } catch {
    throw new Error("Claude API에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.");
  }
  if (!res.ok) throw await readError(res, "Claude");
  const data = await res.json();
  const text: string | undefined = data?.content?.[0]?.text;
  if (!text) throw new Error("AI 응답을 받지 못했습니다. 다시 시도해 주세요.");
  return text;
}

/** 현재 선택된 제공자로 AI 호출 → 생성된 텍스트 반환 */
export async function callAi(
  prompt: string,
  opts: CallOptions = {}
): Promise<string> {
  const providerId: ProviderId = getProvider();
  const def = getProviderDef(providerId);
  const apiKey = getProviderKey(providerId);
  if (!apiKey) throw new AiKeyMissingError();
  const model = getProviderModel(providerId);

  switch (providerId) {
    case "openai":
      return callOpenAi(apiKey, model, prompt, opts);
    case "claude":
      return callClaude(apiKey, model, prompt, opts);
    case "gemini":
    default:
      return callGemini(apiKey, model, prompt, opts);
  }
}

/** 현재 기본 제공자의 표시 이름 (에러 메시지용) */
export function currentProviderLabel(): string {
  return getProviderDef(getProvider()).label;
}

/** JSON 응답 파싱 (마크다운 펜스 제거 후 파싱) */
export function parseJsonResponse<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
