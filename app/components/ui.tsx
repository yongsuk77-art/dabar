"use client";

import React, { useEffect, useRef, useState } from "react";

/* ---------- 상단 바 (딥그린) ---------- */

export function TopBar({
  title = "다바르",
  subtitle = "DABAR · 설교 준비 스튜디오",
  right,
  onLogoClick,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  onLogoClick?: () => void;
}) {
  return (
    <header className="bg-pine-900 text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <button
          onClick={onLogoClick}
          className="flex items-center gap-3 text-left"
          aria-label="홈으로"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-clay-600 font-display text-xl font-black text-white">
            ד
          </span>
          <span>
            <span className="block text-[10px] font-semibold tracking-[0.28em] text-pine-100/70">
              {subtitle}
            </span>
            <span className="font-display block text-xl font-bold leading-tight">
              {title}
            </span>
          </span>
        </button>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}

/* ---------- 버튼 ---------- */

export function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "accent" | "secondary" | "ghost" | "danger";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const styles: Record<string, string> = {
    primary: "bg-pine-900 text-white hover:bg-pine-950 shadow-sm",
    accent: "bg-clay-600 text-white hover:bg-clay-700 shadow-sm",
    secondary:
      "bg-white text-ink-900 border border-cream-200 hover:bg-cream-50",
    ghost: "text-ink-500 hover:bg-cream-100",
    danger: "bg-white text-red-700 border border-red-300 hover:bg-red-50",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------- 카드 ---------- */

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-cream-200 bg-white shadow-[0_1px_2px_rgba(27,58,48,0.05)] ${className}`}
    >
      {children}
    </div>
  );
}

/* ---------- 섹션 제목 (키커 + 세리프) ---------- */

export function SectionTitle({
  children,
  hint,
  kicker,
}: {
  children: React.ReactNode;
  hint?: string;
  kicker?: string;
}) {
  return (
    <div className="mb-3">
      {kicker && <p className="kicker mb-1.5">{kicker}</p>}
      <h3 className="font-display text-lg font-bold text-ink-900">
        {children}
      </h3>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

/* ---------- 자동 높이 텍스트에어리어 ---------- */

export function AutoTextarea({
  value,
  onChange,
  placeholder,
  minRows = 4,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={minRows}
      className={`w-full resize-y rounded-xl border border-cream-200 bg-cream-50/50 px-3.5 py-2.5 text-sm leading-relaxed text-ink-900 placeholder:text-ink-400 focus:border-clay-500 focus:bg-white focus:ring-2 focus:ring-clay-100 ${className}`}
    />
  );
}

/* ---------- 텍스트 입력 ---------- */

export function TextInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-xl border border-cream-200 bg-cream-50/50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-clay-500 focus:bg-white focus:ring-2 focus:ring-clay-100 ${className}`}
    />
  );
}

/* ---------- 모달 ---------- */

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);
  if (!open && !mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-modal="true"
      role="dialog"
    >
      <div className="absolute inset-0 bg-pine-950/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xl leading-none text-ink-400 hover:bg-cream-100 hover:text-ink-900"
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- 빈 상태 ---------- */

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-cream-200 bg-cream-50/60 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-50 text-2xl">
        {icon}
      </div>
      <p className="font-display mt-4 font-bold text-ink-900">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>
      )}
    </div>
  );
}

/* ---------- 체크 배지 ---------- */

export function CheckBadge({ done }: { done: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
        done ? "bg-pine-100 text-pine-800" : "bg-cream-100 text-ink-400"
      }`}
    >
      {done ? "✓" : ""}
    </span>
  );
}
