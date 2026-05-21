// Usa o import.meta.env, mas com um fallback direto se falhar
const API_BASE = (import.meta.env.VITE_API_URL || "https://func-securitest-x7wdl.azurewebsites.net/api").replace(/\/api\/.*$/, "");

export interface ScanResult {
  id: string;
  target_url: string;      // Mudado para obrigatório
  started_at: string;      // Mudado para obrigatório
  final_score: number;
  findings_count: number;
  status: "completed" | "in-progress" | "failed";
  findings: any[];         // Array real de vulnerabilidades
}

async function safeFetch(endpoint: string, options: RequestInit = {}) {
  // Constrói a URL de forma segura
  const url = `${API_BASE}/api/${endpoint}`;
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  return await response.json();
}

export async function fetchScans(): Promise<ScanResult[]> {
  try {
    const data = await safeFetch("scans");
    
    // Se a API retornar o array diretamente, isto funcionará.
    // Se a API devolver { "scans": [...] }, o .scans resolve.
    return Array.isArray(data) ? data : (data.scans || []);
  } catch (err) {
    console.error("Erro no fetchScans:", err);
    return [];
  }
}

export async function startScan(url: string): Promise<ScanResult> {
  // O scanner exige 'base_url' e 'target_url'. 
  // Se a 'base_url' for a própria URL que estás a scanear, envia-a nos dois campos.
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
