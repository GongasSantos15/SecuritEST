// Usa o import.meta.env, mas com um fallback direto se falhar
const API_BASE = (import.meta.env.VITE_API_URL || "https://func-securitest-x7wdl.azurewebsites.net/api").replace(/\/api\/.*$/, "");

export interface ScanResult {
  id: string;
  target_url: string;
  started_at: string;
  final_score: number;    // Certifica-te que este nome bate certo com a BD
  findings_count: number; // Certifica-te que este nome bate certo com a BD
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
    const data = await safeFetch("scans");
    
    // LOG DE SEGURANÇA: Abre a consola (F12) e vê o que aparece aqui
    console.log("Dados recebidos da API:", data); 

    if (!data) return [];

    // Tenta normalizar: se for um array, usa-o. Se for um objeto com uma propriedade de lista, usa-a.
    const results = Array.isArray(data) ? data : (data.scans || Object.values(data));
    
    return results;
  } catch (err) {
    console.error("Erro crítico no fetchScans:", err);
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
