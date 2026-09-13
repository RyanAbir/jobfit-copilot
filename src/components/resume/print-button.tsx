"use client";

type PrintButtonProps = {
  label?: string;
};

export default function PrintButton({
  label = "Download PDF",
}: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
    >
      {label}
    </button>
  );
}
