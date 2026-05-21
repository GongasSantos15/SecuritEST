// Lemos o URL exato e completo que o GitHub Actions injetou
const BASE_API_URL = import.meta.env.VITE_API_URL.replace(/\/api\/.*$/, "");

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

// Função utilitária de fetch com tratamento de erro
async function safeFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_API_URL}/${endpoint.replace(/^\//, "")}`;
  console.log(`A chamar: ${url}`); // Debug no F12
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`Erro ${response.status} ao contactar ${endpoint}`);
  }
  return response.json();
}

export async function fetchScans(): Promise<ScanResult[]> {
  try {
    const data = await safeFetch("scans");
    return Array.isArray(data) ? data : (data.items || []);
  } catch (err) {
    console.error("Erro no fetchScans:", err);
    return []; // Retorna vazio em vez de crashar a app
  }
}

// Exemplo de como DEVE estar:
export async function startScan(url: string): Promise<ScanResult> {
  const response = await fetch(`${API_BASE}/api/StartScan`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
    throw new Error(`Erro ao iniciar scan: ${response.status}`);
  }

  return await response.json(); 
}
