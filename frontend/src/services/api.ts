// Define a base URL (tenta ler do env, se falhar usa o padrão)
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

// Função utilitária para garantir que o fetch é seguro
async function safeFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`Erro ${response.status} ao contactar ${endpoint}`);
  }
  
  return await response.json();
}

// ─── Listar todos os scans ─────────────
export async function fetchScans(): Promise<ScanResult[]> {
  try {
    const data = await safeFetch("scans");
    return Array.isArray(data) ? data : (data.items || []);
  } catch (err) {
    console.error("Erro no fetchScans:", err);
    return [];
  }
}

// ─── Disparar novo scan ────────────
export async function startScan(url: string): Promise<ScanResult> {
  // Agora o return está dentro da função, o build passará sem erros!
  return await safeFetch("StartScan", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
}
