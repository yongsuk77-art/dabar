"use client";

/**
 * 다바르 — AI 제공자 관리.
 *
 * Gemini / OpenAI / Claude 중 목사님이 선택한 제공자를 사용합니다.
 * 각 제공자의 API 키와 모델명은 브라우저 localStorage에만 저장됩니다.
 */

export type ProviderId = "gemini" | "openai" | "claude";

export interface ProviderDef {
  id: ProviderId;
  label: string;
  keyUrl: string;
  keyUrlLabel: string;
  keyPlaceholder: string;
  defaultModel: string;
  modelHint: string;
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: "gemini",
    label: "Gemini",
    keyUrl: "https://aistudio.google.com/apikey",
    keyUrlLabel: "AI Studio에서 키 발급",
    keyPlaceholder: "AI Studio API 키를 붙여넣으세요",
    defaultModel: "gemini-flash-latest",
    modelHint: "예: gemini-flash-latest",
  },
  {
    id: "openai",
    label: "OpenAI",
    keyUrl: "https://platform.openai.com/api-keys",
    keyUrlLabel: "OpenAI에서 키 발급",
    keyPlaceholder: "sk-... 키를 붙여넣으세요",
    defaultModel: "gpt-4o-mini",
    modelHint: "예: gpt-4o-mini",
  },
  {
    id: "claude",
    label: "Claude",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyUrlLabel: "Anthropic Console에서 키 발급",
    keyPlaceholder: "sk-ant-... 키를 붙여넣으세요",
    defaultModel: "claude-sonnet-4-5",
    modelHint: "예: claude-sonnet-4-5",
  },
];

const PROVIDER_KEY = "dabar_provider";
const keyOf = (id: ProviderId) => `dabar_key_${id}`;
const modelOf = (id: ProviderId) => `dabar_model_${id}`;
const LEGACY_GEMINI_KEY = "dabar_gemini_api_key";

function read(key: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(key) ?? "";
}

function write(key: string, value: string): void {
  if (typeof window === "undefined") return;
  const v = value.trim();
  if (v) localStorage.setItem(key, v);
  else localStorage.removeItem(key);
}

export function getProviderDef(id: ProviderId): ProviderDef {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

/** 현재 선택된(기본) 제공자 */
export function getProvider(): ProviderId {
  const v = read(PROVIDER_KEY);
  return v === "openai" || v === "claude" ? v : "gemini";
}

export function setProvider(id: ProviderId): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROVIDER_KEY, id);
}

/** 제공자별 API 키 (구버전 Gemini 키는 자동 이전) */
export function getProviderKey(id: ProviderId): string {
  const v = read(keyOf(id));
  if (v) return v;
  if (id === "gemini") {
    const legacy = read(LEGACY_GEMINI_KEY);
    if (legacy) {
      write(keyOf(id), legacy);
      if (typeof window !== "undefined")
        localStorage.removeItem(LEGACY_GEMINI_KEY);
      return legacy;
    }
  }
  return "";
}

export function setProviderKey(id: ProviderId, key: string): void {
  write(keyOf(id), key);
}

export function clearProviderKey(id: ProviderId): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(keyOf(id));
}

/** 제공자별 모델명 (미설정 시 기본값) */
export function getProviderModel(id: ProviderId): string {
  return read(modelOf(id)) || getProviderDef(id).defaultModel;
}

export function setProviderModel(id: ProviderId, model: string): void {
  write(modelOf(id), model);
}
