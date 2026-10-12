"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteSermon,
  deleteStyleSample,
  exportBackup,
  loadSermons,
  loadStyleSamples,
  saveSermon,
  saveStyleSample,
} from "@/app/lib/storage";
import { newSermon, type Sermon, type StyleSample } from "@/app/lib/types";
import {
  AutoTextarea,
  Button,
  Card,
  CheckBadge,
  EmptyState,
  Modal,
  SectionTitle,
  TextInput,
  TopBar,
} from "@/app/components/ui";
import { ApiKeySettings } from "@/app/components/ai-settings";

/** 단계별 진행도 (연구/개요/어조/설교문) */
function stepProgress(s: Sermon): boolean[] {
  const r = s.research;
  const researchDone = !!(
    r.background.trim() ||
    r.originalLanguage.trim() ||
    r.structure.trim() ||
    r.themes.trim() ||
    r.crossReferences.trim()
  );
  const outlineDone = s.outlineConfirmed;
  const tonesDone = s.selectedTones.length > 0;
  const m = s.manuscripts;
  const manuscriptDone = s.selectedTones.some((t) => m[t].trim());
  return [researchDone, outlineDone, tonesDone, manuscriptDone];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function Home() {
  const router = useRouter();
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [samples, setSamples] = useState<StyleSample[]>([]);
  const [passage, setPassage] = useState("");
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [sampleModal, setSampleModal] = useState(false);
  const [sampleTitle, setSampleTitle] = useState("");
  const [sampleContent, setSampleContent] = useState("");

  useEffect(() => {
    setSermons(loadSermons());
    setSamples(loadStyleSamples());
  }, []);

  const createSermon = () => {
    if (!passage.trim()) {
      alert("성경 본문을 입력해 주세요. (예: 갈라디아서 4:1-7)");
      return;
    }
    const s = newSermon(title, passage, theme);
    // 워크스페이스에서 localStorage로 불러오므로 즉시 저장
    saveSermon(s);
    setSermons([s, ...sermons]);
    setPassage("");
    setTitle("");
    setTheme("");
    router.push(`/sermon?id=${s.id}`);
  };

  const removeSermon = (id: string, name: string) => {
    if (!confirm(`"${name}" 설교를 삭제하시겠습니까?`)) return;
    deleteSermon(id);
    setSermons((prev) => prev.filter((s) => s.id !== id));
  };

  const addSample = () => {
    if (!sampleContent.trim()) {
      alert("원고 내용을 입력해 주세요.");
      return;
    }
    const sample: StyleSample = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `sample-${Date.now()}`,
      title: sampleTitle.trim() || `설교 원고 ${samples.length + 1}`,
      content: sampleContent,
      createdAt: new Date().toISOString(),
    };
    saveStyleSample(sample);
    setSamples((prev) => [sample, ...prev]);
    setSampleTitle("");
    setSampleContent("");
    setSampleModal(false);
  };

  const removeSample = (id: string, name: string) => {
    if (!confirm(`"${name}" 원고를 삭제하시겠습니까?`)) return;
    deleteStyleSample(id);
    setSamples((prev) => prev.filter((s) => s.id !== id));
  };

  const downloadBackup = () => {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dabar-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const steps = ["연구", "개요", "어조", "설교문"];

  return (
    <div className="min-h-screen">
      <TopBar
        right={
          samples.length > 0 ? (
            <Button
              variant="ghost"
              className="text-pine-100 hover:bg-white/10 hover:text-white"
              onClick={downloadBackup}
            >
              백업 저장
            </Button>
          ) : undefined
        }
      />

      <main className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        {/* 히어로 */}
        <header className="py-10 text-center sm:py-14">
          <p className="kicker">Dabar · Sermon Studio</p>
          <h1 className="font-display mt-3 text-4xl font-black text-pine-950 sm:text-5xl">
            말씀을 준비하는 시간
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-500">
            본문과 주제를 입력하고 연구 → 개요 → 어조 선택 → 설교문 순서로
            차근차근 준비하세요. 작성 중인 내용은 이 기기에 자동 저장됩니다.
          </p>
        </header>

        {/* AI 자동 작성 설정 */}
        <div className="mb-8">
          <ApiKeySettings />
        </div>

        {/* 새 설교 시작 */}
        <Card className="mb-10 p-6 sm:p-8">
          <SectionTitle
            kicker="New Sermon"
            hint="주제는 선택사항입니다. 예: 갈라디아서 4:1-7, 요한복음 3:16, 시편 23편"
          >
            새 설교 시작
          </SectionTitle>
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="sm:w-64">
                <TextInput
                  value={passage}
                  onChange={setPassage}
                  placeholder="성경 본문 (예: 갈라디아서 4:1-7)"
                />
              </div>
              <div className="flex-1">
                <TextInput
                  value={title}
                  onChange={setTitle}
                  placeholder="설교 제목 (비워두면 본문으로 자동 설정)"
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <TextInput
                  value={theme}
                  onChange={setTheme}
                  placeholder="설교 주제/방향 (선택, 예: 종에서 아들로 — 신분의 복음)"
                />
              </div>
              <Button
                variant="accent"
                onClick={createSermon}
                className="shrink-0 px-8"
              >
                시작하기 →
              </Button>
            </div>
          </div>
        </Card>

        {/* 설교 목록 */}
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between border-b border-cream-200 pb-3">
            <div>
              <p className="kicker">My Sermons</p>
              <h2 className="font-display mt-1 text-2xl font-bold text-pine-950">
                내 설교{" "}
                <span className="text-base font-semibold text-ink-400">
                  {sermons.length}
                </span>
              </h2>
            </div>
          </div>
          {sermons.length === 0 ? (
            <EmptyState
              icon="📖"
              title="아직 준비 중인 설교가 없습니다"
              description="위에서 성경 본문을 입력하고 첫 설교 준비를 시작해 보세요."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {sermons.map((s) => {
                const prog = stepProgress(s);
                const doneCount = prog.filter(Boolean).length;
                return (
                  <Card
                    key={s.id}
                    className="group p-5 transition-shadow hover:shadow-md"
                  >
                    <button
                      className="block w-full text-left"
                      onClick={() => router.push(`/sermon?id=${s.id}`)}
                    >
                      <p className="text-xs font-bold tracking-wide text-clay-600">
                        {s.passage}
                      </p>
                      <h3 className="font-display mt-1.5 truncate text-lg font-bold text-ink-900">
                        {s.title}
                      </h3>
                      {s.theme && (
                        <p className="mt-1 truncate text-xs text-ink-500">
                          {s.theme}
                        </p>
                      )}
                      <div className="mt-4 flex items-center gap-1.5">
                        {steps.map((label, i) => (
                          <span
                            key={label}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              prog[i]
                                ? "bg-pine-100 text-pine-800"
                                : "bg-cream-100 text-ink-400"
                            }`}
                          >
                            {prog[i] ? "✓" : "○"} {label}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-cream-100 pt-3">
                        <p className="text-xs text-ink-400">
                          {formatDate(s.updatedAt)} 수정
                        </p>
                        <p className="text-xs font-bold text-pine-800">
                          {doneCount}/4 단계
                        </p>
                      </div>
                    </button>
                    <div className="mt-1 flex justify-end">
                      <Button
                        variant="ghost"
                        className="px-2 py-1 text-xs text-ink-400 hover:text-red-600"
                        onClick={() => removeSermon(s.id, s.title)}
                      >
                        삭제
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* 스타일 학습 */}
        <section className="mb-12">
          <div className="mb-4 flex items-end justify-between border-b border-cream-200 pb-3">
            <div>
              <p className="kicker">Voice Training</p>
              <h2 className="font-display mt-1 text-2xl font-bold text-pine-950">
                목사님 어조 학습{" "}
                <span className="text-base font-semibold text-ink-400">
                  {samples.length}
                </span>
              </h2>
            </div>
            <Button variant="secondary" onClick={() => setSampleModal(true)}>
              + 원고 추가
            </Button>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-ink-500">
            평소 설교하신 원고나 대표 설교문을 등록해 두세요. 아벨이 목사님의
            문장 리듬과 표현 방식을 학습하는 데 사용합니다.
          </p>
          {samples.length === 0 ? (
            <EmptyState
              icon="✍️"
              title="등록된 원고가 없습니다"
              description="설교 원고 텍스트를 붙여넣어 목사님의 어조를 학습시켜 보세요."
            />
          ) : (
            <div className="space-y-2">
              {samples.map((s) => (
                <Card
                  key={s.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-ink-900">
                      {s.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {formatDate(s.createdAt)} ·{" "}
                      {s.content.length.toLocaleString()}자
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="shrink-0 px-2 py-1 text-xs text-ink-400 hover:text-red-600"
                    onClick={() => removeSample(s.id, s.title)}
                  >
                    삭제
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="bg-pine-950 py-8 text-center">
        <p className="font-display text-sm font-bold text-cream-100">
          다바르(DABAR)
        </p>
        <p className="mt-1 text-xs text-pine-100/60">
          말씀이신 하나님을 전하는 설교 준비 도구
        </p>
      </footer>

      {/* 원고 추가 모달 */}
      <Modal
        open={sampleModal}
        onClose={() => setSampleModal(false)}
        title="설교 원고 등록"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink-900">
              원고 제목
            </label>
            <TextInput
              value={sampleTitle}
              onChange={setSampleTitle}
              placeholder="예: 종에서 아들로 (갈라디아서 4:1-7)"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink-900">
              원고 내용
            </label>
            <AutoTextarea
              value={sampleContent}
              onChange={setSampleContent}
              placeholder="설교 원고 전문을 붙여넣으세요"
              minRows={12}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSampleModal(false)}>
              취소
            </Button>
            <Button onClick={addSample}>등록하기</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
