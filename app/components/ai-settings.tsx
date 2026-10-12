"use client";

import { useEffect, useState } from "react";
import {
  PROVIDERS,
  ProviderId,
  clearProviderKey,
  getProvider,
  getProviderDef,
  getProviderKey,
  getProviderModel,
  setProvider,
  setProviderKey,
  setProviderModel,
} from "@/app/lib/providers";
import { Button, Card, SectionTitle, TextInput } from "@/app/components/ui";

/** AI 제공자 설정 (Gemini / OpenAI / Claude) — 키는 브라우저에만 저장 */
export function ApiKeySettings({ compact = false }: { compact?: boolean }) {
  const [provider, setProviderState] = useState<ProviderId>("gemini");
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");
  const [show, setShow] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const p = getProvider();
    setProviderState(p);
    setModel(getProviderModel(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const def = getProviderDef(provider);
  const saved = !!getProviderKey(provider);

  const selectProvider = (id: ProviderId) => {
    setProvider(id);
    setProviderState(id);
    setKey("");
    setModel(getProviderModel(id));
    setTick((t) => t + 1);
  };

  const save = () => {
    if (key.trim()) setProviderKey(provider, key);
    if (model.trim()) setProviderModel(provider, model);
    setKey("");
    setTick((t) => t + 1);
  };

  const remove = () => {
    if (!confirm(`${def.label} API 키를 삭제하시겠습니까?`)) return;
    clearProviderKey(provider);
    setTick((t) => t + 1);
  };

  if (compact) {
    return (
      <div className="rounded-xl bg-white/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-ink-900">✨ AI 자동 작성</p>
          <select
            value={provider}
            onChange={(e) => selectProvider(e.target.value as ProviderId)}
            className="rounded-lg border border-cream-200 bg-white px-1.5 py-1 text-xs font-semibold text-ink-900"
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
                {getProviderKey(p.id) ? " ✓" : ""}
              </option>
            ))}
          </select>
        </div>
        {!saved ? (
          <div className="mt-2 space-y-2">
            <TextInput
              value={key}
              onChange={setKey}
              placeholder={def.keyPlaceholder}
            />
            <div className="flex gap-1.5">
              <Button
                variant="accent"
                className="flex-1 px-2 py-1.5 text-xs"
                onClick={save}
              >
                저장
              </Button>
              <a
                href={def.keyUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-lg border border-cream-200 bg-white px-2 py-1.5 text-center text-xs font-semibold text-ink-900 hover:bg-cream-50"
              >
                키 발급받기
              </a>
            </div>
            <p className="text-[11px] leading-relaxed text-ink-400">
              키는 이 브라우저에만 저장됩니다.
            </p>
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between">
            <span className="rounded-full bg-pine-100 px-2 py-0.5 text-[11px] font-bold text-pine-800">
              연결됨
            </span>
            <button
              onClick={remove}
              className="text-[11px] text-ink-400 underline underline-offset-2 hover:text-red-600"
            >
              키 삭제
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <SectionTitle
        kicker="AI Setup"
        hint="사용할 AI를 고르고 API 키를 입력하면, 연구·개요·설교문을 자동으로 작성해 줍니다. 키는 이 브라우저에만 저장되며 외부로 전송되지 않습니다."
      >
        ✨ AI 자동 작성 설정
      </SectionTitle>

      {/* 제공자 탭 */}
      <div className="mb-5 flex gap-2">
        {PROVIDERS.map((p) => {
          const active = p.id === provider;
          const hasKey = !!getProviderKey(p.id);
          return (
            <button
              key={p.id}
              onClick={() => selectProvider(p.id)}
              className={`relative flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                active
                  ? "border-clay-500 bg-clay-500 text-white shadow"
                  : "border-cream-200 bg-white text-ink-900 hover:border-clay-300"
              }`}
            >
              {p.label}
              {hasKey && (
                <span
                  className={`absolute right-2 top-2 h-2 w-2 rounded-full ${
                    active ? "bg-white" : "bg-pine-500"
                  }`}
                  title="키 연결됨"
                />
              )}
            </button>
          );
        })}
      </div>

      {saved ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-pine-50 px-4 py-3">
            <p className="text-sm font-semibold text-pine-800">
              ✓ {def.label} 키가 연결되어 있습니다
            </p>
            <Button variant="ghost" className="text-xs" onClick={remove}>
              키 삭제
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <label className="shrink-0 text-xs font-bold text-ink-500">
              모델
            </label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={def.modelHint}
              className="w-full rounded-xl border border-cream-200 bg-cream-50/50 px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-clay-500 focus:bg-white focus:ring-2 focus:ring-clay-100"
            />
            <Button
              variant="secondary"
              className="shrink-0 px-4 py-2 text-xs"
              onClick={save}
            >
              모델 저장
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <input
                type={show ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={def.keyPlaceholder}
                className="w-full rounded-xl border border-cream-200 bg-cream-50/50 px-3.5 py-2.5 pr-16 text-sm text-ink-900 placeholder:text-ink-400 focus:border-clay-500 focus:bg-white focus:ring-2 focus:ring-clay-100"
              />
              <button
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-400 hover:text-ink-900"
              >
                {show ? "숨기기" : "보기"}
              </button>
            </div>
            <div className="flex shrink-0 gap-2">
              <a
                href={def.keyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-cream-200 bg-white px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-cream-50"
              >
                {def.keyUrlLabel}
              </a>
              <Button variant="accent" onClick={save} className="px-6">
                저장
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="shrink-0 text-xs font-bold text-ink-500">
              모델 (선택)
            </label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={def.modelHint}
              className="w-full rounded-xl border border-cream-200 bg-cream-50/50 px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-clay-500 focus:bg-white focus:ring-2 focus:ring-clay-100"
            />
          </div>
        </div>
      )}
    </Card>
  );
}
