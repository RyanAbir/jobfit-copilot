"use client";

import { useState } from "react";

type CopyButtonProps = {
  value: string;
  label?: string;
};

export default function CopyButton({
  value,
  label = "Copy",
}: CopyButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("failed");
      setTimeout(() => setStatus("idle"), 1500);
    }
  }

  const statusText =
    status === "copied" ? "Copied" : status === "failed" ? "Failed" : label;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
    >
      {statusText}
    </button>
  );
}
