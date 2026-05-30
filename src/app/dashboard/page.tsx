const dashboardCards = [
  { label: "Total jobs analyzed", value: "0" },
  { label: "Strong matches", value: "0" },
  { label: "Draft applications", value: "0" },
  { label: "Applied jobs", value: "0" },
];

export default function DashboardPage() {
  return (
    <main>
      <section className="grid gap-4 sm:grid-cols-2">
        {dashboardCards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5"
          >
            <p className="text-sm font-medium text-slate-600">{card.label}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {card.value}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
