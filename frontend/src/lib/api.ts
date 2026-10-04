/**
 * Cairnquill API client.
 * Sends X-Role and X-User headers with every request.
 */

import { useAppStore } from './store'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

function getHeaders(): HeadersInit {
  const { role, user } = useAppStore.getState()
  return {
    'Content-Type': 'application/json',
    'X-Role': role,
    'X-User': user,
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...getHeaders(), ...init.headers },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }))
    const msg = body?.error?.message ?? res.statusText
    throw new Error(`${res.status}: ${msg}`)
  }

  return res.json() as Promise<T>
}

export const api = {
  // Alerts
  getAlerts: (status = 'OPEN') =>
    request<{ alerts: Alert[]; synthetic_data: boolean }>(`/alerts?status=${status}`),

  // Cases
  createCase: (alertId: number) =>
    request<{ case_id: string; status: string }>('/cases', {
      method: 'POST',
      body: JSON.stringify({ alert_id: alertId }),
    }),

  getCase: (caseId: string) =>
    request<{ case: CaseRecord; cairns: Cairn[]; kyc: KYC | null }>(`/cases/${caseId}`),

  mineEvidence: (caseId: string, windowHours = 168) =>
    request<{ case_id: string; status: string; result: unknown }>(
      `/cases/${caseId}/mine?window_hours=${windowHours}`,
      { method: 'POST' },
    ),

  createDraft: (caseId: string) =>
    request<VerifyResponse & { draft_id: string; status: string }>(
      `/cases/${caseId}/draft`,
      { method: 'POST' },
    ),

  verifyClaims: (caseId: string) =>
    request<VerifyResponse>(`/cases/${caseId}/verify`, { method: 'POST' }),

  submitCase: (caseId: string) =>
    request<{ case_id: string; status: string }>(`/cases/${caseId}/submit`, { method: 'POST' }),

  approveCase: (caseId: string) =>
    request<{ case_id: string; filing_id: string; seal_sha: string }>(`/cases/${caseId}/approve`, { method: 'POST' }),

  rejectCase: (caseId: string, comment: string) =>
    request<{ case_id: string; status: string }>(`/cases/${caseId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),

  // Filings
  getFilings: () => request<{ filings: Filing[] }>('/filings'),
  getFiling: (id: string) => request<FilingDetail>(`/filings/${id}`),
  replayFiling: (id: string) => request<ReplayResult>(`/filings/${id}/replay`, { method: 'POST' }),

  // Demo
  injectError: (draftId: string, claimId: string, mutation = 'AMOUNT_X1_1') =>
    request('/demo/inject-error', {
      method: 'POST',
      body: JSON.stringify({ draft_id: draftId, claim_id: claimId, mutation }),
    }),

  // Eval
  getScoreboard: () => request<{ runs: EvalRun[] }>('/eval/scoreboard'),
  runPlantedErrors: () => request('/eval/plant-errors', { method: 'POST' }),

  // Ask
  ask: (question: string) =>
    request<AskResponse>('/ask', { method: 'POST', body: JSON.stringify({ question }) }),
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Alert {
  ALERT_ID: number
  ACCOUNT_KEY: string
  SCORE: number
  MODEL_VERSION: string
  CREATED_TS: string
  SLA_DUE: string
  STATUS: string
  DAYS_REMAINING: number
}

export interface CaseRecord {
  CASE_ID: string
  ALERT_ID: number
  ACCOUNT_KEY: string
  TYPOLOGY_DETECTED: string | null
  STATUS: string
  MAKER: string
  CREATED_TS: string
  SLA_DUE: string
}

export interface Cairn {
  CAIRN_ID: string
  PATTERN_TYPE: string
  SUMMARY: Record<string, unknown>
  CREATED_TS: string
}

export interface KYC {
  ACCOUNT_KEY: string
  CUSTOMER_NAME_SYNTH: string
  OCCUPATION: string
  DECLARED_MONTHLY_INCOME: number
  INCOME_CCY: string
  BRANCH: string
  RISK_RATING: string
}

export interface Claim {
  claim_id: string
  type: 'SUM_AMOUNT' | 'COUNT_TXNS' | 'DISTINCT_COUNTERPARTIES' | 'TIME_SPAN_HOURS' | 'PATTERN_EXISTS' | 'KYC_MISMATCH' | 'JUDGEMENT'
  text: string
  params: Record<string, unknown>
  asserted: { value: number | string; currency?: string } | null
  evidence_ids: number[]
}

export interface VerdictItem {
  claim_id: string
  verdict: 'VERIFIED' | 'CONTRADICTED' | 'UNSUPPORTED' | 'JUDGEMENT'
  asserted: { value: number | string; currency?: string } | null
  actual: { value: number | string; currency?: string } | null
  tolerance_used: number | null
  error: string | null
}

export interface VerifyResponse {
  case_id: string
  draft_id: string
  blocked: boolean
  verdicts: VerdictItem[]
  claims?: Claim[]
  omissions: string[]
}

export interface Filing {
  FILING_ID: string
  CASE_ID: string
  DRAFT_ID: string
  SEAL_SHA: string
  MAKER: string
  APPROVER: string
  APPROVED_TS: string
}

export interface FilingDetail {
  filing: Filing & { VERSIONS: Record<string, string>; EVIDENCE_SHA: string; PREV_SEAL_SHA: string | null }
  draft: { CLAIMS: Claim[]; MODEL: string; PROMPT_VERSION: string; AUTHOR: string } | null
  verdicts: VerdictItem[]
  cairns: Cairn[]
}

export interface ReplayResult {
  filing_id: string
  match: boolean
  expected_seal: string
  computed_seal: string
  seal_prefix: string
  verification: VerifyResponse
  tampered: boolean
}

export interface EvalRun {
  RUN_ID: string
  KIND: string
  METRICS: Record<string, unknown>
  TS: string
}

export interface AskResponse {
  question: string
  answer: string
  source: string
  citations: { source: string; section: string; url: string; passage: string }[]
}
