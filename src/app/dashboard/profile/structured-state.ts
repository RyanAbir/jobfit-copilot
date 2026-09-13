export type WorkExperienceInput = {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string; // "YYYY-MM"
  endDate: string; // "YYYY-MM"
  isCurrent: boolean;
  description: string;
};

export type EducationInput = {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
};

export type ProjectInput = {
  id: string;
  name: string;
  url: string;
  description: string;
  techStack: string; // comma-separated in the editor
};

export type StructuredSaveResult = { ok: boolean; error?: string };

export function emptyWorkExperience(id: string): WorkExperienceInput {
  return {
    id,
    company: "",
    title: "",
    location: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    description: "",
  };
}

export function emptyEducation(id: string): EducationInput {
  return {
    id,
    institution: "",
    degree: "",
    fieldOfStudy: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    description: "",
  };
}

export function emptyProject(id: string): ProjectInput {
  return {
    id,
    name: "",
    url: "",
    description: "",
    techStack: "",
  };
}

/** "YYYY-MM-DD" (or "YYYY-MM") from the database → "YYYY-MM" for a month input. */
export function toMonthInput(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  const match = v.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : "";
}
