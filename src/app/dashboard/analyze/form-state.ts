import type { ExtractedJobDetails, JobFitAnalysis } from "@/lib/ai/types";

export type AnalyzeFieldName =
  | "source_url"
  | "job_post_text"
  | "jobTextInput"
  | "jobUrlInput"
  | "jobImage";

export type AnalyzeFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<Record<AnalyzeFieldName, string>>;
  submitted?: {
    job_title: string;
    company_name: string;
    source_url: string;
    work_type: string;
    salary_range: string;
    job_post_text: string;
  };
  analysis?: JobFitAnalysis;
  model?: string;
  saved?: {
    jobId: string;
    analysisId?: string;
    generatedApplicationId?: string;
  };
};

export const initialAnalyzeFormState: AnalyzeFormState = {
  status: "idle",
  message: "",
};

export type JobExtractionFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<Record<AnalyzeFieldName, string>>;
  details?: ExtractedJobDetails;
};

export const initialJobExtractionFormState: JobExtractionFormState = {
  status: "idle",
  message: "",
};
