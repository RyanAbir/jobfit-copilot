"use client";

type ErrorRetryProps = {
  title?: string;
  description?: string;
  reset: () => void;
};

export default function ErrorRetry({
  title = "Something went wrong",
  description = "We could not load this section right now. This is usually temporary.",
  reset,
}: ErrorRetryProps) {
  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
      <h3 className="text-lg font-semibold text-rose-900">{title}</h3>
      <p className="mt-2 text-sm text-rose-700">{description}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 inline-flex rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100"
      >
        Try again
      </button>
    </section>
  );
}
