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
  const endpoint = `${API_BASE.replace(/\/$/, "")}/StartScan`; // Base URL + /StartScan
  
  console.log("A tentar iniciar scan em:", endpoint);

  const response = await fetch(endpoint, {
    method: "POST", // Certifica-te que a tua Function no Azure aceita POST
    headers: { 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ target_url: url }) // Ajustei para target_url baseado no teu JSON
  });

  if (!response.ok) {
    // Se der 404, o nome da função está errado ou não aceita POST
    throw new Error(`Falha ao iniciar scan. Código: ${response.status}`);
  }

  return await response.json();
}
