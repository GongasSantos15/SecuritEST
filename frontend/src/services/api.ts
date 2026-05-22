// Usa o import.meta.env, mas com um fallback direto se falhar
const API_BASE = (import.meta.env.VITE_API_URL || "https://func-securitest-x7wdl.azurewebsites.net/api").replace(/\/api\/.*$/, "");

// Objeto de scan que define as suas propriedades e tipos (conforme a BD)
export interface ScanResult {
  id: string;
  target_url: string;
  started_at: string;
  final_score: number;
  findings_count: number;
  status: "completed" | "in-progress" | "failed";
  findings: any[];           
}

// Faz o request HTTP, verifica se correu bem, se sim, devolve os dados em JSON
async function safeFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}/api/${endpoint}`;
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  return await response.json();
}

// Função que vai faz o fetch dos scans da API. Devolve um array com vários scans.
export async function fetchScans(): Promise<ScanResult[]> {
  try {
    const data = await safeFetch("scans");

    console.log("Dados recebidos da API:", data);

    if (!data) return [];

    if (Array.isArray(data)) return data;

    if (Array.isArray(data.items)) return data.items;

    if (Array.isArray(data.scans)) return data.scans;

    return [];
  } catch (err) {
    console.error("Erro crítico no fetchScans:", err);
    return [];
  }
}

// Função que inicia um scan. Recebe uma URL, envia-a para a API, cria um novo scan e devolve o resultado do mesmo.
export async function startScan(url: string): Promise<ScanResult> {
  const payload = { 
    target_url: url,
    base_url: url 
  };

  return await safeFetch("StartScan", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
