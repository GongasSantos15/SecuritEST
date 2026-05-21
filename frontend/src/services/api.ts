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
  // Vamos enviar exatamente o que a função espera (provavelmente um objeto com a URL)
  const payload = { target_url: url }; 

  const response = await fetch(`${API_BASE}/StartScan`, {
    method: "POST",
    headers: { 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    // Aqui capturamos o erro 500 que o Azure está a devolver
    const errorText = await response.text();
    throw new Error(`Erro ${response.status}: ${errorText}`);
  }

  return await response.json();
}
