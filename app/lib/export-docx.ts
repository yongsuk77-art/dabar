"use client";

/**
 * 다바르 — 설교 Word(.docx) 저장.
 * 목사님 문서 규격: 기본 12pt, A5/A4 용지 선택.
 *
 * 표시 규칙 (AI 생성 시 삽입됨):
 * - [성경] 문단 → 네모박스
 * - [예화]...[/예화] → 파란색
 * - [핵심]...[/핵심] → 붉은색 굵게
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  TextRun,
} from "docx";
import type { Sermon, ToneKey } from "./types";
import { TONES } from "./types";

export type PageSizeOption = "A5" | "A4";

const FONT = "맑은고딕";
const TWIP_PER_MM = 56.693;
const PAGE_MM: Record<PageSizeOption, { w: number; h: number }> = {
  A5: { w: 148, h: 210 },
  A4: { w: 210, h: 297 },
};
const MARGIN_TWIP = Math.round(15 * TWIP_PER_MM); // 15mm

const COLOR_BLUE = "2B6CB0"; // 예화
const COLOR_RED = "C0392B"; // 핵심
const BOX_FILL = "F7F3EC";
const BOX_BORDER = "B0B0B0";

interface ParaOpts {
  bold?: boolean;
  size?: number; // half-points (24 = 12pt)
  color?: string;
  align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  spaceBefore?: number;
  spaceAfter?: number;
}

function para(text: string, opts: ParaOpts = {}): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: FONT,
        size: opts.size ?? 24,
        bold: opts.bold,
        color: opts.color,
      }),
    ],
    alignment: opts.align,
    spacing: {
      before: opts.spaceBefore ?? 0,
      after: opts.spaceAfter ?? 160,
    },
  });
}

interface Segment {
  text: string;
  color?: string;
  bold?: boolean;
}

/** [예화]...[/예화], [핵심]...[/핵심] 인라인 표시 파싱 */
function parseInline(text: string): Segment[] {
  const segments: Segment[] = [];
  const re = /\[(예화|핵심)\]([\s\S]*?)\[\/\1\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index) });
    segments.push({
      text: m[2],
      color: m[1] === "예화" ? COLOR_BLUE : COLOR_RED,
      bold: m[1] === "핵심" ? true : undefined,
    });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments.filter((s) => s.text.length > 0);
}

/** 인라인 표시가 적용된 문단 */
function richPara(text: string, opts: ParaOpts = {}): Paragraph {
  const children = parseInline(text).map(
    (s) =>
      new TextRun({
        text: s.text,
        font: FONT,
        size: opts.size ?? 24,
        bold: opts.bold ?? s.bold,
        color: s.color ?? opts.color,
      })
  );
  return new Paragraph({
    children:
      children.length > 0
        ? children
        : [new TextRun({ text: " ", font: FONT, size: opts.size ?? 24 })],
    alignment: opts.align,
    spacing: {
      before: opts.spaceBefore ?? 0,
      after: opts.spaceAfter ?? 120,
    },
  });
}

/** 연속된 [성경] 줄들을 하나의 네모박스로 렌더링 */
function boxedParas(lines: string[]): Paragraph {
  const children: TextRun[] = [];
  lines.forEach((line, i) => {
    parseInline(line).forEach(
      (s) =>
        children.push(
          new TextRun({
            text: s.text,
            font: FONT,
            size: 22, // 11pt
            bold: s.bold,
            color: s.color,
          })
        )
    );
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });
  const border = { style: BorderStyle.SINGLE, size: 6, color: BOX_BORDER };
  return new Paragraph({
    children,
    shading: { type: ShadingType.CLEAR, fill: BOX_FILL },
    border: { top: border, bottom: border, left: border, right: border },    indent: { left: 200, right: 200 },
    spacing: { before: 120, after: 160 },
  });
}

/** 여러 줄 텍스트 → 표시 규칙이 적용된 문단 배열 */
function richMultiline(text: string, opts: ParaOpts = {}): Paragraph[] {
  const out: Paragraph[] = [];
  let box: string[] = [];
  const flushBox = () => {
    if (box.length > 0) {
      out.push(boxedParas(box));
      box = [];
    }
  };
  for (const rawLine of text.split("\n")) {
    if (rawLine.trimStart().startsWith("[성경]")) {
      box.push(rawLine.trimStart().replace(/^\[성경\]\s*/, ""));
    } else {
      flushBox();
      out.push(richPara(rawLine.trim() === "" ? " " : rawLine, opts));
    }
  }
  flushBox();
  return out;
}

function sectionTitle(text: string): Paragraph {
  return para(text, {
    bold: true,
    size: 30, // 15pt
    spaceBefore: 360,
    spaceAfter: 200,
  });
}

function subTitle(text: string): Paragraph {
  return para(text, { bold: true, size: 24, spaceBefore: 200, spaceAfter: 120 });
}

const RESEARCH_LABELS: { key: keyof Sermon["research"]; label: string }[] = [
  { key: "background", label: "본문 배경" },
  { key: "originalLanguage", label: "원어 분석" },
  { key: "structure", label: "본문 구조" },
  { key: "themes", label: "신학적 주제" },
  { key: "crossReferences", label: "교차 참조" },
];

function sanitizeFileName(name: string): string {
  const clean = name.replace(/[\\/:*?"<>|]/g, "").trim();
  return clean || "설교";
}

/** 설교 전체(연구·개요·설교문)를 .docx Blob으로 생성 */
export async function buildSermonDocx(
  sermon: Sermon,
  pageSize: PageSizeOption
): Promise<Blob> {
  const { w, h } = PAGE_MM[pageSize];
  const children: Paragraph[] = [];

  // 표지 정보
  children.push(
    para(sermon.title || "제목 없음", {
      bold: true,
      size: 40, // 20pt
      align: AlignmentType.CENTER,
      spaceAfter: 240,
    })
  );
  if (sermon.passage)
    children.push(
      para(`본문: ${sermon.passage}`, { align: AlignmentType.CENTER })
    );
  if (sermon.theme)
    children.push(para(`주제: ${sermon.theme}`, { align: AlignmentType.CENTER }));
  children.push(para(" ", { spaceAfter: 120 }));

  // Ⅰ. 본문 연구
  if (Object.values(sermon.research).some((v) => v.trim())) {
    children.push(sectionTitle("Ⅰ. 본문 연구"));
    for (const { key, label } of RESEARCH_LABELS) {
      const v = sermon.research[key].trim();
      if (!v) continue;
      children.push(subTitle(label));
      children.push(...richMultiline(v));
    }
  }

  // Ⅱ. 설교 개요
  const o = sermon.outline;
  if (o.intro.trim() || o.bodyPoints.length > 0 || o.conclusion.trim()) {
    children.push(sectionTitle("Ⅱ. 설교 개요"));
    if (o.intro.trim()) {
      children.push(subTitle("서론"));
      children.push(...richMultiline(o.intro));
    }
    o.bodyPoints.forEach((p, i) => {
      children.push(subTitle(`대지 ${i + 1}. ${p.title || "(제목 없음)"}`));
      if (p.content.trim()) children.push(...richMultiline(p.content));
    });
    if (o.conclusion.trim()) {
      children.push(subTitle("결론"));
      children.push(...richMultiline(o.conclusion));
    }
  }

  // Ⅲ. 설교문 (선택된 어조 순서대로, 비어 있지 않은 것만)
  const toneOrder: ToneKey[] =
    sermon.selectedTones.length > 0
      ? sermon.selectedTones
      : (["gentle", "strong", "healing"] as ToneKey[]);
  const written = toneOrder.filter((t) => sermon.manuscripts[t].trim());
  if (written.length > 0) {
    children.push(sectionTitle("Ⅲ. 설교문"));
    for (const t of written) {
      const label = TONES.find((x) => x.key === t)?.label ?? t;
      children.push(subTitle(`[${label}]`));
      children.push(...richMultiline(sermon.manuscripts[t].trim()));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: Math.round(w * TWIP_PER_MM),
              height: Math.round(h * TWIP_PER_MM),
            },
            margin: {
              top: MARGIN_TWIP,
              bottom: MARGIN_TWIP,
              left: MARGIN_TWIP,
              right: MARGIN_TWIP,
            },
          },
        },
        children,
      },
    ],
  });
  return Packer.toBlob(doc);
}

/** Word 파일 다운로드 */
export async function downloadSermonDocx(
  sermon: Sermon,
  pageSize: PageSizeOption
): Promise<void> {
  const blob = await buildSermonDocx(sermon, pageSize);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFileName(sermon.title)}_${pageSize}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
