export interface ChatResponse {
  answer: string;
}

export interface UploadResponse {
  status: string;
  chunks_stored: number;
  ids?: string[];
}