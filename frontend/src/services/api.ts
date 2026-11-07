import axios from 'axios'
import type { Analysis, Dataset, ForecastResult, Insight, Preview } from '../types'

export const API_URL = import.meta.env.VITE_API_URL ?? '/api'
const http = axios.create({ baseURL: API_URL })

export function errorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    if (!e.response) return 'Cannot reach the backend. Make sure it is running on port 8000.'
    return e.response.data?.detail ?? 'Unexpected server error.'
  }
  return 'Unexpected error.'
}

export const api = {
  datasets: () => http.get<Dataset[]>('/datasets').then(r => r.data),
  workbookSheets: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return http.post<{ sheets: string[] }>('/workbook/sheets', fd).then(r => r.data.sheets)
  },
  upload: (file: File, sheetName?: string) => {
    const fd = new FormData()
    fd.append('file', file)
    if (sheetName) fd.append('sheet_name', sheetName)
    return http.post<Dataset>('/upload', fd).then(r => r.data)
  },
  demo: () => http.post<Dataset>('/demo').then(r => r.data),
  preview: (id: number) => http.get<Preview>(`/datasets/${id}/preview`).then(r => r.data),
  analysis: (id: number, params?: { date_from?: string; date_to?: string; category?: string }) =>
    http.get<Analysis>(`/datasets/${id}/analysis`, { params }).then(r => r.data),
  insights: (id: number) => http.get<{ insights: Insight[] }>(`/datasets/${id}/insights`).then(r => r.data.insights),
  forecast: (id: number) => http.get<ForecastResult>(`/datasets/${id}/forecast`).then(r => r.data),
  exportUrl: (id: number, kind: 'csv' | 'excel') => `${API_URL}/datasets/${id}/export/${kind}`,
}
