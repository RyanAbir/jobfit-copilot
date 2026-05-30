import Link from "next/link";

const features = [
  {
    title: "Job post analysis",
    description:
      "Paste a role and quickly understand required skills, nice-to-haves, responsibilities, and job post red flags.",
  },
  {
    title: "Profile matching",
    description:
      "Compare the role against your real developer profile to see matched, partially matched, and missing skills.",
  },
  {
    title: "Explainable fit score",
    description:
      "Get a practical score based on technical skills, project relevance, experience, work mode, and resume keywords.",
  },
  {
    title: "Tailored application help",
    description:
      "Generate a concise application email and resume keyword suggestions without inventing fake experience.",
  },
];

const steps = [
  "Create your developer profile with skills, projects, links, and resume text.",
  "Paste a job post from LinkedIn, a career page, email, Upwork, or Contra.",
  "Review the fit score, skill gaps, red flags, keywords, and application email.",
  "Save the analysis and track the application from your dashboard.",
];

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-lg leading-8 text-slate-600">{description}</p>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-blue-700">
        ✓
      </div>
      <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
      <p className="mt-3 leading-7 text-slate-600">{description}</p>
    </article>
  );
}

function StepCard({ step, text }: { step: number; text: string }) {
  return (
    <article className="flex gap-5 rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
        {step}
      </div>
      <p className="leading-7 text-slate-700">{text}</p>
    </article>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-slate-50 text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-12">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            JobFit Copilot
          </Link>
          <Link
            href="/dashboard/analyze"
            className="hidden rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 sm:inline-flex"
          >
            Analyze Your First Job
          </Link>
        </nav>

        <div className="grid flex-1 items-center gap-12 py-20 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm">
              AI-powered job application assistant for full-stack developers
            </p>
            <h1 className="mt-8 max-w-4xl text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Analyze jobs. Match your profile. Apply smarter.
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-9 text-slate-600">
              JobFit Copilot helps developers understand job requirements,
              compare them with their real skills, generate an honest fit score,
              and prepare a stronger manual application.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/dashboard/analyze"
                className="inline-flex items-center justify-center rounded-full bg-blue-700 px-7 py-4 text-base font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800"
              >
                Analyze Your First Job
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-7 py-4 text-base font-semibold text-slate-800 transition hover:border-blue-300 hover:text-blue-700"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-blue-900/10">
            <div className="rounded-3xl bg-slate-950 p-5 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm text-blue-200">Fit score</p>
                  <p className="text-4xl font-bold">78</p>
                </div>
                <span className="rounded-full bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-100">
                  Good Match
                </span>
              </div>
              <div className="mt-5 space-y-4">
                {[
                  ["Matched skills", "React, Next.js, Node.js"],
                  ["Missing skills", "Docker, CI/CD"],
                  ["Resume keywords", "Authentication, APIs, dashboards"],
                  ["Red flags", "Salary not mentioned"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl bg-white/10 p-4 backdrop-blur"
                  >
                    <p className="text-sm font-medium text-slate-300">
                      {label}
                    </p>
                    <p className="mt-1 font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-6 py-20 sm:px-8">
        <SectionHeader
          eyebrow="The problem"
          title="Job posts are noisy. Your application should not be."
          description="Developers often waste time decoding long job posts, guessing whether they qualify, and writing generic cover letters that do not reflect their real projects."
        />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 sm:px-8 lg:px-12">
        <SectionHeader
          eyebrow="Features"
          title="Everything you need before you apply"
          description="The MVP focuses on honest decision support: understand the job, compare your profile, and apply with more clarity."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section
        id="how-it-works"
        className="bg-slate-950 px-6 py-24 text-white sm:px-8"
      >
        <div className="mx-auto max-w-7xl lg:px-4">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              A focused flow from job post to saved application
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              The product follows the MVP path: auth, profile, pasted job post,
              AI analysis, fit score, saved application, dashboard, and detail
              page.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {steps.map((step, index) => (
              <StepCard key={step} step={index + 1} text={step} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-24 text-center sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          Ethical boundary
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          JobFit Copilot is not an auto-apply bot.
        </h2>
        <p className="mt-5 text-lg leading-8 text-slate-600">
          It helps developers apply manually, honestly, and strategically. The
          system should not invent experience, suggest fake resume claims, or
          automate job portal actions.
        </p>
      </section>

      <section className="px-6 pb-24 sm:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] bg-blue-700 px-6 py-14 text-center text-white shadow-2xl shadow-blue-700/20 sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to apply with more clarity?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-blue-100">
            Paste a job post, compare it with your profile, and decide your next
            move with an explainable fit score.
          </p>
          <Link
            href="/dashboard/analyze"
            className="mt-8 inline-flex rounded-full bg-white px-7 py-4 text-base font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            Analyze Your First Job
          </Link>
        </div>
      </section>
    </main>
  );
}
