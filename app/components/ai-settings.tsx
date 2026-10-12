"use client";

import { useEffect, useState } from "react";
import {
  AI_STUDIO_KEY_URL,
  clearApiKey,
  getApiKey,
  setApiKey,
} from "@/app/lib/gemini";
import { Button, Card, SectionTitle, TextInput } from "@/app/components/ui";

/** AI Studio API 키 설정 (브라우저 localStorage에만 저장) */
export function ApiKeySettings({ compact = false }: { compact?: boolean }) {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setSaved(!!getApiKey());
  }, []);

  const save = () => {
    if (!key.trim()) return;
    setApiKey(key);
    setKey("");
    setSaved(true);
  };

  const remove = () => {
    if (!confirm("저장된 API 키를 삭제하시겠습니까?")) return;
    clearApiKey();
    setSaved(false);
  };

  if (compact) {
    return (
      <div className="rounded-xl bg-white/60 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-ink-900">✨ AI 자동 작성</p>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              saved ? "bg-pine-100 text-pine-800" : "bg-cream-200 text-ink-500"
            }`}
          >
            {saved ? "연결됨" : "미설정"}
          </span>
        </div>
        {!saved ? (
          <div className="mt-2 space-y-2">
            <TextInput
              value={key}
              onChange={setKey}
              placeholder="AI Studio API 키 입력"
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
                href={AI_STUDIO_KEY_URL}
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
          <button
            onClick={remove}
            className="mt-2 text-[11px] text-ink-400 underline underline-offset-2 hover:text-red-600"
          >
            키 삭제
          </button>
        )}
      </div>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <SectionTitle
        kicker="AI Setup"
        hint="AI Studio에서 발급받은 API 키를 입력하면, 연구·개요·설교문을 자동으로 작성해 줍니다. 키는 이 브라우저에만 저장되며 외부로 전송되지 않습니다."
      >
        ✨ AI 자동 작성 설정
      </SectionTitle>
      {saved ? (
        <div className="flex items-center justify-between rounded-xl bg-pine-50 px-4 py-3">
          <p className="text-sm font-semibold text-pine-800">
            ✓ API 키가 연결되어 있습니다
          </p>
          <Button variant="ghost" className="text-xs" onClick={remove}>
            키 삭제
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input
              type={show ? "text" : "password"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AI Studio API 키를 붙여넣으세요"
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
              href={AI_STUDIO_KEY_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-cream-200 bg-white px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-cream-50"
            >
              키 발급받기
            </a>
            <Button variant="accent" onClick={save} className="px-6">
              저장
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
