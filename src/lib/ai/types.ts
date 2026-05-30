export type MatchLabel =
  | "Strong Match"
  | "Good Match"
  | "Partial Match"
  | "Weak Match";

export type ScoreBreakdown = {
  technicalSkillMatch: number;
  projectRelevance: number;
  experienceMatch: number;
  locationWorkModeMatch: number;
  resumeKeywordMatch: number;
};

export type ResumeKeywordSuggestions = {
  frontend: string[];
  backend: string[];
  database: string[];
  authentication: string[];
  payment: string[];
  deployment: string[];
  testing: string[];
  softSkills: string[];
};

export type JobFitAnalysis = {
  jobTitle: string;
  companyName: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  responsibilities: string[];
  experienceLevel: string;
  workType: string;
  location: string;
  redFlags: string[];
  matchedSkills: string[];
  partiallyMatchedSkills: string[];
  missingSkills: string[];
  relevantProjects: string[];
  weakAreas: string[];
  resumeKeywordSuggestions: ResumeKeywordSuggestions;
  generatedEmailSubject: string;
  generatedApplicationEmail: string;
  interviewPreparationQuestions: string[];
  scoreBreakdown: ScoreBreakdown;
  finalScore: number;
  matchLabel: MatchLabel;
  scoreExplanation: string;
};

export type JobAnalysisInput = {
  jobTitle: string;
  companyName: string;
  sourceUrl: string;
  workType: string;
  salaryRange: string;
  jobPostText: string;
};

export type ExtractedJobDetails = {
  jobTitle: string;
  companyName: string;
  sourceUrl: string;
  workType: string;
  salaryRange: string;
  jobPostText: string;
  location: string;
  experienceLevel: string;
  confidenceNotes: string;
};

export type CandidateProfileForAnalysis = {
  fullName: string;
  targetRole: string;
  location: string;
  experienceLevel: string;
  skills: string[];
  mainTechStack: string[];
  projects: string;
  experienceSummary: string;
  resumeText: string;
  portfolioUrl: string;
  githubUrl: string;
  linkedinUrl: string;
};
