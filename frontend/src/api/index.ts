// src/api/index.ts
import axios from 'axios';
import { UploadResponse, ChatResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const fetchChatResponse = async (query: string): Promise<ChatResponse> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/chat`, { query });
    return response.data as ChatResponse;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch chat response');
  }
};

export const uploadPDF = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await axios.post(`${API_BASE_URL}/upload_pdf`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data as UploadResponse;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || 'Failed to upload PDF');
  }
};
