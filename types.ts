
export interface ProposalFormData {
  projectName: string;
  projectType: string;
  background: string;
  requirements: string;
  keywords: string;
  standards: string;
  tone: 'professional' | 'technical' | 'persuasive' | 'concise';
  model: string;
  images: string[]; // Array of base64 strings
}

export interface GeneratedSection {
  id: string;
  title: string;
  content: string;
}

export interface ProposalState {
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  content: string;
}

export enum AppStep {
  INPUT = 'INPUT',
  GENERATING = 'GENERATING',
  PREVIEW = 'PREVIEW'
}
