import type { ReactNode } from "react";
import type { ResumeData } from "@/lib/resume";

function TextBlocks({ text }: { text: string }) {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        const lines = block
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        const isBulleted = lines.every((line) => /^[-•*]/.test(line));

        if (isBulleted && lines.length > 1) {
          return (
            <ul
              key={index}
              className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700"
            >
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{line.replace(/^[-•*]\s*/, "")}</li>
              ))}
            </ul>
          );
        }

        return (
          <p
            key={index}
            className="whitespace-pre-line text-sm leading-6 text-slate-700"
          >
            {block}
          </p>
        );
      })}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="resume-section mt-5">
      <h2 className="border-b border-slate-300 pb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-800">
        {title}
      </h2>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

export default function ResumeDocument({ data }: { data: ResumeData }) {
  return (
    <article className="resume-sheet mx-auto w-full max-w-3xl bg-white p-8 text-slate-900 sm:p-10">
      <header className="border-b-2 border-slate-800 pb-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          {data.name}
        </h1>
        <p className="mt-0.5 text-sm font-semibold text-blue-700">
          {data.role}
          {data.experienceLevel ? ` · ${data.experienceLevel}` : ""}
        </p>
        {data.contacts.length > 0 ? (
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
            {data.contacts.map((contact, index) => (
              <span key={`${contact.label}-${index}`}>
                {contact.href ? (
                  <a
                    href={contact.href}
                    className="text-slate-700 underline-offset-2 hover:underline"
                  >
                    {contact.value}
                  </a>
                ) : (
                  contact.value
                )}
              </span>
            ))}
          </p>
        ) : null}
      </header>

      {data.tailoredFor ? (
        <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 print:bg-transparent print:px-0">
          Tailored for {data.tailoredFor.jobTitle}
          {data.tailoredFor.companyName
            ? ` at ${data.tailoredFor.companyName}`
            : ""}
        </p>
      ) : null}

      {data.summary ? (
        <Section title="Summary">
          <p className="text-sm leading-6 text-slate-700">{data.summary}</p>
        </Section>
      ) : null}

      {data.skills.length > 0 ? (
        <Section title="Core Skills">
          <p className="text-sm leading-6 text-slate-700">
            {data.skills.join(" · ")}
          </p>
          {data.highlightedSkills.length > 0 ? (
            <p className="mt-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">
                Highlighted for this role:
              </span>{" "}
              {data.highlightedSkills.join(", ")}
            </p>
          ) : null}
        </Section>
      ) : null}

      {data.experiences.length > 0 ? (
        <Section title="Experience">
          <div className="space-y-3">
            {data.experiences.map((exp, index) => (
              <div key={index}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {exp.title}
                    {exp.company ? ` · ${exp.company}` : ""}
                  </p>
                  {exp.dateRange ? (
                    <p className="text-xs text-slate-500">{exp.dateRange}</p>
                  ) : null}
                </div>
                {exp.location ? (
                  <p className="text-xs text-slate-500">{exp.location}</p>
                ) : null}
                {exp.description ? (
                  <div className="mt-1">
                    <TextBlocks text={exp.description} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : data.experienceDetail ? (
        <Section title="Experience">
          <TextBlocks text={data.experienceDetail} />
        </Section>
      ) : null}

      {data.projectItems.length > 0 ? (
        <Section title="Projects">
          <div className="space-y-3">
            {data.projectItems.map((proj, index) => (
              <div key={index}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {proj.name}
                  </p>
                  {proj.url ? (
                    <a
                      href={
                        /^https?:\/\//i.test(proj.url)
                          ? proj.url
                          : `https://${proj.url}`
                      }
                      className="text-xs text-slate-500 underline-offset-2 hover:underline"
                    >
                      {proj.url.replace(/^https?:\/\//i, "")}
                    </a>
                  ) : null}
                </div>
                {proj.tech ? (
                  <p className="text-xs text-slate-500">{proj.tech}</p>
                ) : null}
                {proj.description ? (
                  <div className="mt-1">
                    <TextBlocks text={proj.description} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : data.projects ? (
        <Section title="Projects">
          <TextBlocks text={data.projects} />
        </Section>
      ) : null}

      {data.educationItems.length > 0 ? (
        <Section title="Education">
          <div className="space-y-3">
            {data.educationItems.map((edu, index) => (
              <div key={index}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {edu.degree || edu.institution}
                  </p>
                  {edu.dateRange ? (
                    <p className="text-xs text-slate-500">{edu.dateRange}</p>
                  ) : null}
                </div>
                {edu.degree && edu.institution ? (
                  <p className="text-xs text-slate-500">{edu.institution}</p>
                ) : null}
                {edu.description ? (
                  <div className="mt-1">
                    <TextBlocks text={edu.description} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {data.recommendedKeywords.length > 0 ? (
        <Section title="Keywords for This Application">
          <p className="text-sm leading-6 text-slate-700">
            {data.recommendedKeywords.join(", ")}
          </p>
        </Section>
      ) : null}
    </article>
  );
}
