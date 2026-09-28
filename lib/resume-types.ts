// Pure types + constants shared by server queries and client components.
// Kept free of any database import so client bundles stay clean.

export type EntryKind = "experience" | "project" | "education";
export const ENTRY_KINDS: EntryKind[] = ["experience", "project", "education"];

export const SECTION_TITLE: Record<EntryKind, string> = {
  experience: "Experience",
  project: "Projects",
  education: "Education",
};
export const SECTION_LABEL: Record<EntryKind, string> = {
  experience: "EXPERIENCE",
  project: "PROJECTS",
  education: "EDUCATION",
};
/** Field labels differ per section — a school isn't a "company". */
export const ORG_LABEL: Record<EntryKind, string> = {
  experience: "Company",
  project: "Project",
  education: "School",
};
export const TITLE_LABEL: Record<EntryKind, string> = {
  experience: "Title",
  project: "Subtitle",
  education: "Degree",
};

export type ResumeBullet = {
  id: number;
  text: string;
  source: "manual" | "ai";
  position: number;
};
export type ResumeEntry = {
  id: number;
  kind: EntryKind;
  org: string;
  title: string;
  dates: string;
  position: number;
  bullets: ResumeBullet[];
};
export type ResumeSkill = { id: number; category: string; items: string; position: number };
export type Resume = {
  id: number;
  name: string;
  fullName: string;
  headline: string;
  email: string;
  location: string;
  links: string;
  summary: string;
  entries: ResumeEntry[];
  skills: ResumeSkill[];
};
