// Usa o import.meta.env, mas com um fallback direto se falhar
const API_BASE = (import.meta.env.VITE_API_URL || "https://func-securitest-x7wdl.azurewebsites.net/api").replace(/\/api\/.*$/, "");

export interface ScanResult {
  id: string;
  target_url: string;
  started_at: string;
  final_score: number;
  findings_count: number;
  status: "completed" | "in-progress" | "failed";
  findings: any[];
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
    return await safeFetch("scans");
  } catch (err) {
    console.error("Erro no fetchScans:", err);
    return [];
  }
}

export async function startScan(url: string): Promise<ScanResult> {
  return await safeFetch("StartScan", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_url: url })
  });
}
