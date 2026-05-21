// Define a base URL (tenta ler do env, se falhar usa o padrão do Azure)
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

// Função utilitária central para chamadas à API
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
  // O return está DENTRO da função, o que resolve o erro de sintaxe
  return await safeFetch("StartScan", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
}
