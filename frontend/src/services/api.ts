const API_BASE = (import.meta.env.VITE_API_URL || "https://func-securitest-x7wdl.azurewebsites.net/api")
  .replace(/\/api\/.*$/, "");

export interface Finding {
  id: string;
  name: string;
  owasp?: string;
  endpoint?: string;
  severity: number;
  confidence?: number;
  weight?: number;
  evidence?: string;
  recommendation: string;
  title?: string;
  description?: string;
  category?: string;
}

export interface ScanResult {
  id: string;
  scan_id: string;
  target_url: string;
  started_at: string;
  finished_at?: string;
  status: "completed" | "in-progress" | "failed";
  final_score: number;
  grade?: string;
  findings_count: number;
  findings: Finding[];
  // campos legados (compatibilidade)
  url?: string;
  timestamp?: string;
  riskScore?: number;
  vulnerabilities?: any[];
  vulnerabilityCount?: number;
}

async function safeFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}/api/${endpoint}`;
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return await response.json();
}

export async function fetchScans(): Promise<ScanResult[]> {
  const data = await safeFetch("GetScans");

  console.log("Dados recebidos da API:", data);

  if (!data) return [];

  // A API devolve { count: N, items: [...] }
  if (data.items && Array.isArray(data.items)) {
    return data.items;
  }

  // Fallback: se vier array direto
  if (Array.isArray(data)) {
    return data;
  }

  return [];
}

export async function startScan(url: string): Promise<ScanResult> {
  const payload = {
    target_url: url,
    base_url: url
  };

  return await safeFetch("StartScan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}