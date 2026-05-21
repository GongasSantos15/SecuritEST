// Define a base URL com fallback seguro
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api\/.*$/, "") || "https://func-securitest-x7wdl.azurewebsites.net/api";

export interface Vulnerability {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  description: string;
  endpoint?: string;
  recommendation: string;
}

export interface ScanResult {
  id: string;
  scan_id: string;
  url: string;
  timestamp: string;
  status: "completed" | "in-progress" | "failed";
  riskScore: number;
  vulnerabilities: Vulnerability[];
  vulnerabilityCount: number;
}

// Função utilitária interna
async function safeFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// ─── Funções Exportadas ─────────────
export async function fetchScans(): Promise<ScanResult[]> {
  try {
    const data = await safeFetch("scans");
    return Array.isArray(data) ? data : (data.items || []);
  } catch (err) {
    console.error("Erro no fetchScans:", err);
    return [];
  }
}

export async function startScan(url: string): Promise<ScanResult> {
  // O return ESTÁ DENTRO das chavetas da função, resolvendo o erro de build
  return await safeFetch("StartScan", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
}
