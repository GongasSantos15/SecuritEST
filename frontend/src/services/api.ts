// No topo do ficheiro, guarde apenas a base, sem o caminho final
const BASE_API_URL = import.meta.env.VITE_API_URL.replace(/\/api\/.*$/, "");

export interface Finding {
  id: string;
  name: string;
  owasp: string;
  endpoint: string;
  severity: number;
  recommendation: string;
  category: string;
  description: string;
}
export interface ScanResult {
  id: string;
  target_url: string;
  status: "completed" | "in-progress" | "failed";
  final_score: number;
  findings: Finding[];
  findings_count: number;
  started_at: string;
}

// ─── Funções Exportadas ─────────────
export async function fetchScans(): Promise<ScanResult[]> {
  // Constrói o URL dinamicamente
  const response = await fetch(`${BASE_API_URL}/api/scans`, {
    method: "GET"
  });

  if (!response.ok) {
    throw new Error(`Erro ao carregar scans: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.items || []);
}

export async function startScan(url: string): Promise<ScanResult> {
  const response = await fetch(`${BASE_URL}/StartScan`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_url: url })
  });

  if (!response.ok) {
    throw new Error(`Erro ao iniciar scan: ${response.status}`);
  }

  return await response.json();
}
