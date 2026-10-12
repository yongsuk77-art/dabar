"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadSermon, loadStyleSamples, saveSermon } from "@/app/lib/storage";
import {
  TONES,
  type OutlinePoint,
  type ResearchData,
  type Sermon,
  type ToneKey,
} from "@/app/lib/types";
import {
  AutoTextarea,
  Button,
  Card,
  CheckBadge,
  SectionTitle,
  TextInput,
  TopBar,
} from "@/app/components/ui";
import { ApiKeySettings } from "@/app/components/ai-settings";
import { downloadSermonDocx, PageSizeOption } from "@/app/lib/export-docx";
import {
  generateManuscripts,
  generateOutline,
  generateResearch,
} from "@/app/lib/ai";
import { AiKeyMissingError, currentProviderLabel } from "@/app/lib/ai-client";

type Step = "research" | "outline" | "tones" | "manuscript";

const STEPS: {
  key: Step;
  label: string;
  num: string;
  desc: string;
  icon: string;
}[] = [
  { key: "research", label: "연구", num: "01", desc: "본문 배경·원어·구조 파악", icon: "📖" },
  { key: "outline", label: "개요", num: "02", desc: "서론·대지·결론 정리", icon: "📝" },
  { key: "tones", label: "어조 선택", num: "03", desc: "3가지 어조 중 복수 선택", icon: "🎙️" },
  { key: "manuscript", label: "설교문", num: "04", desc: "어조별 설교문 작성", icon: "✍️" },
];

const RESEARCH_SECTIONS: {
  key: keyof ResearchData;
  label: string;
  desc: string;
}[] = [
  { key: "background", label: "본문 배경", desc: "역사적·문화적 배경, 저자와 수신자 상황" },
  { key: "originalLanguage", label: "원어 분석", desc: "히브리어·헬라어 핵심 단어의 의미와 용법" },
  { key: "structure", label: "본문 구조", desc: "문학적 구조와 단락의 흐름" },
  { key: "themes", label: "신학적 주제", desc: "본문의 핵심 메시지와 신학적 의미" },
  { key: "crossReferences", label: "교차 참조", desc: "관련 성경 구절과 참고 본문" },
];

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function SermonWorkspace() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id") ?? "";

  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState<Step>("research");
  const [tone, setTone] = useState<ToneKey>("gentle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<
    null | "research" | "outline" | "manuscript"
  >(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiErrorStep, setAiErrorStep] = useState<Step | null>(null);
  const [pageSize, setPageSize] = useState<PageSizeOption>("A5");
  const [exporting, setExporting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstLoad = useRef(true);

  // 설교 불러오기
  useEffect(() => {
    if (!id) {
      setNotFound(true);
      return;
    }
    const s = loadSermon(id);
    if (!s) setNotFound(true);
    else {
      setSermon(s);
      if (s.selectedTones.length > 0) setTone(s.selectedTones[0]);
    }
  }, [id]);

  // 변경 시 자동 저장 (디바운스)
  useEffect(() => {
    if (!sermon) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    setSaving(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveSermon(sermon);
      setSaving(false);
      const d = new Date();
      setSavedAt(
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
      );
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [sermon]);

  const patch = (fn: (s: Sermon) => Sermon) => {
    setSermon((prev) => (prev ? fn(prev) : prev));
  };

  const progress = useMemo(() => {
    if (!sermon) return [false, false, false, false];
    const r = sermon.research;
    const researchDone = RESEARCH_SECTIONS.some((sec) => r[sec.key].trim());
    const outlineDone = sermon.outlineConfirmed;
    const tonesDone = sermon.selectedTones.length > 0;
    const manuscriptDone = sermon.selectedTones.some((t) =>
      sermon.manuscripts[t].trim()
    );
    return [researchDone, outlineDone, tonesDone, manuscriptDone];
  }, [sermon]);

  if (notFound) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-4xl">🔍</p>
        <h1 className="mt-4 text-xl font-bold text-ink-900">
          설교를 찾을 수 없습니다
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          삭제되었거나 다른 브라우저에서 저장된 설교일 수 있습니다.
        </p>
        <div className="mt-6">
          <Button onClick={() => router.push("/")}>홈으로 돌아가기</Button>
        </div>
      </main>
    );
  }

  if (!sermon) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center text-ink-400">
        불러오는 중…
      </main>
    );
  }

  /* ---------- 개요 편집 헬퍼 ---------- */

  const addPoint = () => {
    const point: OutlinePoint = { id: uid(), title: "", content: "" };
    patch((s) => ({
      ...s,
      outline: { ...s.outline, bodyPoints: [...s.outline.bodyPoints, point] },
    }));
  };

  const updatePoint = (
    pid: string,
    field: "title" | "content",
    value: string
  ) => {
    patch((s) => ({
      ...s,
      outline: {
        ...s.outline,
        bodyPoints: s.outline.bodyPoints.map((p) =>
          p.id === pid ? { ...p, [field]: value } : p
        ),
      },
    }));
  };

  const removePoint = (pid: string) => {
    patch((s) => ({
      ...s,
      outline: {
        ...s.outline,
        bodyPoints: s.outline.bodyPoints.filter((p) => p.id !== pid),
      },
    }));
  };

  const outlineHasContent = () => {
    const o = sermon.outline;
    return !!(
      o.intro.trim() ||
      o.conclusion.trim() ||
      o.bodyPoints.some((p) => p.title.trim() || p.content.trim())
    );
  };

  const confirmOutline = () => {
    if (!outlineHasContent()) {
      alert("개요 내용을 먼저 입력해 주세요. (서론·대지·결론 중 하나 이상)");
      return;
    }
    if (
      !confirm(
        "개요를 최종 확정하시겠습니까?\n확정 후에는 어조 선택과 설교문 단계로 넘어갑니다."
      )
    )
      return;
    const now = new Date().toISOString();
    patch((s) => ({ ...s, outlineConfirmed: true, outlineConfirmedAt: now }));
  };

  const unconfirmOutline = () => {
    if (!confirm("개요 확정을 해제하고 다시 수정하시겠습니까?")) return;
    patch((s) => ({
      ...s,
      outlineConfirmed: false,
      outlineConfirmedAt: null,
    }));
  };

  /* ---------- Word 저장 ---------- */

  const exportWord = async () => {
    setExporting(true);
    try {
      await downloadSermonDocx(sermon, pageSize);
    } catch (e) {
      alert(
        e instanceof Error ? e.message : "Word 저장 중 오류가 발생했습니다."
      );
    } finally {
      setExporting(false);
    }
  };

  /* ---------- AI 자동 생성 ---------- */

  const friendlyAiError = (e: unknown): string => {
    if (e instanceof AiKeyMissingError) {
      return `API 키가 설정되지 않았습니다. 왼쪽 사이드바의 'AI 자동 작성'에서 ${currentProviderLabel()} 키를 입력해 주세요.`;
    }
    return e instanceof Error ? e.message : "생성 중 오류가 발생했습니다.";
  };

  const runAiResearch = async () => {
    setAiError(null);
    setAiErrorStep(null);
    setGenerating("research");
    try {
      const r = await generateResearch(
        sermon.passage,
        sermon.title,
        sermon.theme
      );
      patch((s) => ({ ...s, research: r }));
    } catch (e) {
      setAiError(friendlyAiError(e));
      setAiErrorStep("research");
    } finally {
      setGenerating(null);
    }
  };

  const runAiOutline = async () => {
    setAiError(null);
    setAiErrorStep(null);
    setGenerating("outline");
    try {
      const o = await generateOutline(
        sermon.passage,
        sermon.title,
        sermon.theme,
        sermon.research
      );
      patch((s) => ({ ...s, outline: o }));
    } catch (e) {
      setAiError(friendlyAiError(e));
      setAiErrorStep("outline");
    } finally {
      setGenerating(null);
    }
  };

  const runAiManuscripts = async () => {
    if (sermon.selectedTones.length === 0) {
      alert("먼저 어조를 선택해 주세요.");
      return;
    }
    setAiError(null);
    setAiErrorStep(null);
    setGenerating("manuscript");
    try {
      const samples = loadStyleSamples();
      const styleSample = samples[0]?.content.slice(0, 1500) ?? "";
      const m = await generateManuscripts(
        sermon.passage,
        sermon.title,
        sermon.theme,
        sermon.outline,
        sermon.selectedTones,
        styleSample
      );
      patch((s) => ({ ...s, manuscripts: { ...s.manuscripts, ...m } }));
    } catch (e) {
      setAiError(friendlyAiError(e));
      setAiErrorStep("manuscript");
    } finally {
      setGenerating(null);
    }
  };

  /* ---------- 어조 선택 헬퍼 ---------- */

  const toggleTone = (key: ToneKey) => {
    const has = sermon.selectedTones.includes(key);
    const next = has
      ? sermon.selectedTones.filter((t) => t !== key)
      : [...sermon.selectedTones, key];
    patch((s) => ({ ...s, selectedTones: next }));
    if (!has) {
      // 새로 선택한 어조 탭으로 이동
      setTone(key);
    } else if (tone === key && next.length > 0) {
      // 보고 있던 탭을 해제한 경우 첫 번째 남은 어조로 이동
      setTone(next[0]);
    }
  };

  const orderedSelectedTones = TONES.filter((t) =>
    sermon.selectedTones.includes(t.key)
  );
  const activeToneInfo =
    orderedSelectedTones.find((t) => t.key === tone) ?? orderedSelectedTones[0];
  const activeTone: ToneKey = activeToneInfo ? activeToneInfo.key : "gentle";
  const manuscriptText = sermon.manuscripts[activeTone];

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const goStep = (dir: 1 | -1) => {
    const next = STEPS[stepIndex + dir];
    if (next) setStep(next.key);
  };

  const activeStepInfo = STEPS[stepIndex];

  return (
    <div className="min-h-screen">
      <TopBar
        onLogoClick={() => router.push("/")}
        right={
          <p className="text-xs text-pine-100/70">
            {saving
              ? "저장 중…"
              : savedAt
                ? `✓ ${savedAt} 저장됨`
                : "자동 저장 켜짐"}
          </p>
        }
      />

      <div className="mx-auto flex max-w-6xl items-start gap-6 px-4 py-6 sm:px-6">
        {/* 단계 사이드바 (데스크톱) */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-6 rounded-2xl bg-cream-100 p-3">
            <p className="kicker px-3 pt-1">설교 준비 단계</p>
            <nav className="mt-2 space-y-1">
              {STEPS.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => setStep(s.key)}
                  className={`flex w-full items-center gap-3 rounded-xl border-l-4 px-3 py-3 text-left transition-colors ${
                    step === s.key
                      ? "border-clay-600 bg-white shadow-sm"
                      : "border-transparent hover:bg-white/60"
                  }`}
                >
                  <span className="text-xl leading-none">{s.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold text-ink-400">
                      {s.num}
                    </span>
                    <span className="font-display block text-[15px] font-bold leading-snug text-ink-900">
                      {s.label}
                    </span>
                  </span>
                  <CheckBadge done={progress[i]} />
                </button>
              ))}
            </nav>
            <div className="mt-3">
              <ApiKeySettings compact />
            </div>
            <div className="mt-3 border-t border-cream-200 px-1 pt-3">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => router.push("/")}
              >
                ← 설교 목록으로
              </Button>
            </div>
          </div>
        </aside>

        {/* 본문 */}
        <main className="min-w-0 flex-1">
          {/* 모바일 단계 칩 */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setStep(s.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${
                  step === s.key
                    ? "border-pine-900 bg-pine-900 text-white"
                    : "border-cream-200 bg-white text-ink-500"
                }`}
              >
                {progress[i] ? "✓" : s.num} {s.label}
              </button>
            ))}
          </div>

          {/* 제목 / 본문 / 주제 */}
          <Card className="mb-6 p-5 sm:p-6">
            <p className="kicker mb-2">Sermon</p>
            <input
              value={sermon.title}
              onChange={(e) => patch((s) => ({ ...s, title: e.target.value }))}
              placeholder="설교 제목"
              className="font-display w-full bg-transparent text-2xl font-black text-pine-950 placeholder:text-ink-400/40 focus:outline-none sm:text-3xl"
            />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2">
                <span className="shrink-0 text-xs font-bold text-clay-600">
                  본문
                </span>
                <TextInput
                  value={sermon.passage}
                  onChange={(v) => patch((s) => ({ ...s, passage: v }))}
                  placeholder="예: 갈라디아서 4:1-7"
                  className="font-semibold"
                />
              </div>
              <div className="flex flex-1 items-center gap-2">
                <span className="shrink-0 text-xs font-bold text-clay-600">
                  주제
                </span>
                <TextInput
                  value={sermon.theme}
                  onChange={(v) => patch((s) => ({ ...s, theme: v }))}
                  placeholder="설교 주제/방향 (선택)"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-cream-200 pt-3">
              <span className="text-xs font-bold text-ink-500">
                📄 Word 저장
              </span>
              <div className="flex overflow-hidden rounded-lg border border-cream-200">
                {(["A5", "A4"] as PageSizeOption[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setPageSize(s)}
                    className={`px-3 py-1.5 text-xs font-bold transition ${
                      pageSize === s
                        ? "bg-pine-900 text-white"
                        : "bg-white text-ink-900 hover:bg-cream-50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <Button
                variant="primary"
                className="px-3 py-1.5 text-xs"
                onClick={exportWord}
                disabled={exporting}
              >
                {exporting ? "저장 중…" : "Word 저장"}
              </Button>
            </div>
          </Card>

          {/* 단계 헤더 */}
          <div className="mb-5 border-b border-cream-200 pb-4">
            <p className="kicker">
              {activeStepInfo.num} / 04 · 설교 준비
            </p>
            <h2 className="font-display mt-1.5 text-3xl font-black text-pine-950">
              {activeStepInfo.label}
            </h2>
            <p className="mt-1 text-sm text-ink-500">{activeStepInfo.desc}</p>
          </div>

      {/* 1단계: 연구 */}
      {step === "research" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-500">
              본문·제목·주제를 바탕으로 AI가 5개 항목을 자동 작성합니다.
            </p>
            <Button
              variant="accent"
              onClick={runAiResearch}
              disabled={generating !== null}
              className="shrink-0"
            >
              {generating === "research" ? "생성 중…" : "✨ AI로 연구 자동 생성"}
            </Button>
          </div>
          {aiError && aiErrorStep === "research" && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {aiError}
            </p>
          )}
          <Card className="border-cream-200 bg-cream-50 p-4">
            <p className="text-sm text-ink-900">
              💡 AI 자동 생성으로 채우거나, 아벨과의 채팅에서 받은 연구 결과를
              직접 붙여넣으세요. 작성된 내용은 자유롭게 수정할 수 있습니다.
            </p>
          </Card>
          {RESEARCH_SECTIONS.map((sec) => (
            <Card key={sec.key} className="p-5">
              <SectionTitle hint={sec.desc}>{sec.label}</SectionTitle>
              <AutoTextarea
                value={sermon.research[sec.key]}
                onChange={(v) =>
                  patch((s) => ({
                    ...s,
                    research: { ...s.research, [sec.key]: v },
                  }))
                }
                placeholder={`${sec.label} 내용을 입력하세요`}
                minRows={5}
              />
            </Card>
          ))}
        </div>
      )}

      {/* 2단계: 개요 (컨펌 플로우) */}
      {step === "outline" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-500">
              연구 내용을 바탕으로 AI가 서론·대지·결론 개요를 자동 작성합니다.
            </p>
            <Button
              variant="accent"
              onClick={runAiOutline}
              disabled={generating !== null}
              className="shrink-0"
            >
              {generating === "outline" ? "생성 중…" : "✨ AI로 개요 자동 생성"}
            </Button>
          </div>
          {aiError && aiErrorStep === "outline" && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {aiError}
            </p>
          )}
          {sermon.outlineConfirmed ? (
            <Card className="border-pine-100 bg-pine-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-pine-900">
                    ✓ 개요가 확정되었습니다
                  </p>
                  <p className="mt-1 text-xs text-pine-700">
                    {sermon.outlineConfirmedAt &&
                      `${formatDateTime(sermon.outlineConfirmedAt)} 확정 · `}
                    이제 어조 선택 단계로 넘어가세요.
                  </p>
                </div>
                <Button variant="secondary" onClick={unconfirmOutline}>
                  다시 수정하기
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="border-cream-200 bg-cream-50 p-4">
              <p className="text-sm text-ink-900">
                💡 아벨이 채팅에서 제시한{" "}
                <strong>샘플 개요를 복사해서 붙여넣고</strong>, 목사님이 직접
                수정하세요. 다듬으신 뒤 아래{" "}
                <strong>&ldquo;개요 최종 컨펌&rdquo;</strong>을 눌러 확정합니다.
              </p>
            </Card>
          )}

          <Card className="p-5">
            <SectionTitle hint="청중의 관심을 끄는 도입부">서론</SectionTitle>
            <AutoTextarea
              value={sermon.outline.intro}
              onChange={(v) =>
                patch((s) => ({ ...s, outline: { ...s.outline, intro: v } }))
              }
              placeholder="서론 내용을 입력하세요"
              minRows={5}
            />
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-ink-900">
                  본론 · 대지
                </h3>
                <p className="mt-1 text-xs text-ink-500">
                  2~3개 대지로 논리를 전개하세요
                </p>
              </div>
              <Button variant="secondary" onClick={addPoint}>
                + 대지 추가
              </Button>
            </div>
            {sermon.outline.bodyPoints.length === 0 && (
              <p className="rounded-lg bg-cream-50 px-4 py-6 text-center text-sm text-ink-400">
                아직 대지가 없습니다. &ldquo;대지 추가&rdquo;를 눌러 만드세요.
              </p>
            )}
            <div className="space-y-4">
              {sermon.outline.bodyPoints.map((p, i) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-cream-200 bg-cream-50 p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-clay-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <input
                      value={p.title}
                      onChange={(e) =>
                        updatePoint(p.id, "title", e.target.value)
                      }
                      placeholder={`대지 ${i + 1} 제목`}
                      className="w-full bg-transparent text-sm font-bold text-ink-900 placeholder:text-ink-400 focus:outline-none"
                    />
                    <button
                      onClick={() => removePoint(p.id)}
                      className="shrink-0 rounded px-1.5 py-0.5 text-xs text-ink-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="대지 삭제"
                    >
                      삭제
                    </button>
                  </div>
                  <AutoTextarea
                    value={p.content}
                    onChange={(v) => updatePoint(p.id, "content", v)}
                    placeholder="대지의 핵심 포인트, 성경 근거, 예화 방향 등을 입력하세요"
                    minRows={4}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle hint="적용과 결단으로 이끄는 마무리">결론</SectionTitle>
            <AutoTextarea
              value={sermon.outline.conclusion}
              onChange={(v) =>
                patch((s) => ({
                  ...s,
                  outline: { ...s.outline, conclusion: v },
                }))
              }
              placeholder="결론 내용을 입력하세요"
              minRows={5}
            />
          </Card>

          {!sermon.outlineConfirmed && (
            <div className="flex justify-center pb-2">
              <Button onClick={confirmOutline} className="px-8 py-3 text-base">
                ✓ 개요 최종 컨펌하기
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 3단계: 어조 선택 */}
      {step === "tones" && (
        <div className="space-y-4">
          <Card className="border-cream-200 bg-cream-50 p-4">
            <p className="text-sm text-ink-900">
              💡 설교문을 작성할 어조를 선택하세요.{" "}
              <strong>복수 선택이 가능</strong>합니다. 선택한 어조별로 설교문
              탭이 만들어집니다.
            </p>
          </Card>
          {!sermon.outlineConfirmed && (
            <Card className="border-cream-200 bg-cream-50 p-4">
              <p className="text-sm text-ink-500">
                ℹ️ 개요가 아직 확정되지 않았습니다. 어조는 미리 선택할 수
                있지만, 설교문 단계는 개요 확정 후에 열립니다.
              </p>
            </Card>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            {TONES.map((t) => {
              const selected = sermon.selectedTones.includes(t.key);
              const hasText = sermon.manuscripts[t.key].trim().length > 0;
              return (
                <button
                  key={t.key}
                  onClick={() => toggleTone(t.key)}
                  className={`rounded-xl border-2 p-5 text-left transition-all ${
                    selected
                      ? "border-pine-700 bg-pine-50 shadow-sm"
                      : "border-cream-200 bg-white hover:border-cream-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-md border-2 text-sm font-bold ${
                        selected
                          ? "border-pine-800 bg-pine-800 text-white"
                          : "border-cream-200 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    {hasText && (
                      <span className="rounded-full bg-cream-100 px-2 py-0.5 text-[11px] text-ink-500">
                        작성됨
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 text-base font-bold text-ink-900">
                    {t.label}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500">
                    {t.description}
                  </p>
                </button>
              );
            })}
          </div>
          {sermon.selectedTones.length > 0 && (
            <p className="text-center text-sm text-ink-500">
              {sermon.selectedTones.length}개 어조 선택됨 — 다음 단계에서 각
              어조별 설교문을 작성합니다.
            </p>
          )}
        </div>
      )}

      {/* 4단계: 설교문 */}
      {step === "manuscript" && (
        <div className="space-y-4">
          {!sermon.outlineConfirmed ? (
            <Card className="p-8 text-center">
              <p className="text-4xl">📝</p>
              <h3 className="mt-3 text-base font-bold text-ink-900">
                개요를 먼저 확정해 주세요
              </h3>
              <p className="mt-1 text-sm text-ink-500">
                설교문은 확정된 개요를 바탕으로 작성합니다.
              </p>
              <div className="mt-4">
                <Button onClick={() => setStep("outline")}>
                  개요 단계로 이동 →
                </Button>
              </div>
            </Card>
          ) : sermon.selectedTones.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-4xl">🎙️</p>
              <h3 className="mt-3 text-base font-bold text-ink-900">
                어조를 먼저 선택해 주세요
              </h3>
              <p className="mt-1 text-sm text-ink-500">
                3가지 어조 중 설교문을 작성할 어조를 고르세요. (복수 선택 가능)
              </p>
              <div className="mt-4">
                <Button onClick={() => setStep("tones")}>
                  어조 선택 단계로 이동 →
                </Button>
              </div>
            </Card>
          ) : (
            <>
              <Card className="border-cream-200 bg-cream-50 p-4">
                <p className="text-sm text-ink-900">
                  💡 AI 자동 생성으로 채우거나, 아벨이 각 어조로 작성해 준
                  설교문을 해당 탭에 붙여넣고 다듬으세요.{" "}
                  <button
                    onClick={() => setStep("tones")}
                    className="font-bold underline underline-offset-2"
                  >
                    어조 변경하기
                  </button>
                </p>
              </Card>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-500">
                  선택한 어조별로 설교문을 자동 작성합니다. (순차 생성)
                </p>
                <Button
                  variant="accent"
                  onClick={runAiManuscripts}
                  disabled={generating !== null}
                  className="shrink-0"
                >
                  {generating === "manuscript"
                    ? "생성 중…"
                    : "✨ AI로 설교문 자동 생성"}
                </Button>
              </div>
              {aiError && aiErrorStep === "manuscript" && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  {aiError}
                </p>
              )}

              <div className="flex gap-2">
                {orderedSelectedTones.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTone(t.key)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      activeTone === t.key
                        ? "border-pine-800 bg-pine-800 text-white shadow-sm"
                        : "border-cream-200 bg-white hover:bg-cream-50"
                    }`}
                  >
                    <span
                      className={`block text-sm font-bold ${
                        activeTone === t.key ? "text-white" : "text-ink-900"
                      }`}
                    >
                      {sermon.manuscripts[t.key].trim() ? "● " : "○ "}
                      {t.label}
                    </span>
                    <span
                      className={`mt-0.5 block text-[11px] leading-snug ${
                        activeTone === t.key
                          ? "text-pine-100"
                          : "text-ink-400"
                      }`}
                    >
                      {t.description}
                    </span>
                  </button>
                ))}
              </div>

              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <SectionTitle
                    hint={
                      orderedSelectedTones.find((t) => t.key === activeTone)
                        ?.description
                    }
                  >
                    {
                      orderedSelectedTones.find((t) => t.key === activeTone)
                        ?.label
                    }
                  </SectionTitle>
                  <span className="shrink-0 text-xs text-ink-400">
                    {manuscriptText.length.toLocaleString()}자
                  </span>
                </div>
                <AutoTextarea
                  value={manuscriptText}
                  onChange={(v) =>
                    patch((s) => ({
                      ...s,
                      manuscripts: { ...s.manuscripts, [activeTone]: v },
                    }))
                  }
                  placeholder="설교문을 붙여넣거나 직접 작성하세요"
                  minRows={20}
                  className="leading-loose"
                />
              </Card>
            </>
          )}
        </div>
      )}

      {/* 하단 네비게이션 */}
      <div className="mt-8 flex items-center justify-between pb-10">
        <div>
          {stepIndex > 0 && (
            <Button variant="secondary" onClick={() => goStep(-1)}>
              ← 이전 단계
            </Button>
          )}
        </div>
        <div>
          {stepIndex < STEPS.length - 1 && (
            <Button onClick={() => goStep(1)}>다음 단계 →</Button>
          )}
        </div>
      </div>
        </main>
      </div>
    </div>
  );
}

export default function SermonPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl px-4 py-16 text-center text-ink-400">
          불러오는 중…
        </main>
      }
    >
      <SermonWorkspace />
    </Suspense>
  );
}
