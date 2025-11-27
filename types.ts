
export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // base64 string
}

export interface ProposalFormData {
  projectName: string;
  projectType: string;
  background: string;
  requirements: string;
  keywords: string;
  standards: string;
  tone: 'professional' | 'technical' | 'persuasive' | 'concise';
  pageCount: number; // New field for target page count
  model: string;
  images: string[]; // Array of base64 strings
  attachments: Attachment[]; // Requirement documents
  templates: Attachment[]; // Style/Format templates
}

export interface SubHeader {
  id: string;
  title: string;
}

export interface GeneratedSection {
  id: string; // usually the index
  title: string;
  content: string; // The full markdown content of this section including the header
  rawBody: string; // The content without the header
  subHeaders: SubHeader[]; // H2 headers for navigation
}

export interface ProposalState {
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  content: string;
}

export interface ProposalVersion {
  id: string;
  timestamp: number;
  content: string;
  label: string; // e.g. "Draft 1", "Rewrite: Instruction..."
}

export enum AppStep {
  INPUT = 'INPUT',
  GENERATING = 'GENERATING',
  PREVIEW = 'PREVIEW'
}
