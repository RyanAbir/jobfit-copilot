export type ProfileFormFieldName =
  | "fullName"
  | "targetRole"
  | "skills"
  | "portfolioUrl"
  | "githubUrl"
  | "linkedinUrl";

export type ProfileFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<Record<ProfileFormFieldName, string>>;
};

export const initialProfileFormState: ProfileFormState = {
  status: "idle",
  message: "",
};

export type ProfileFormValues = {
  fullName: string;
  targetRole: string;
  location: string;
  experienceLevel: string;
  skills: string;
  projects: string;
  portfolioUrl: string;
  githubUrl: string;
  linkedinUrl: string;
  resumeText: string;
};
