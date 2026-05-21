const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

const GET_SCANS_URL = `${BASE_URL}/api/scans`;
const START_SCAN_URL = `${BASE_URL}/api/StartScan`;

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

// ─── Listar todos os scans (GET) ─────────────────────────────────────────────
export async function fetchScans(): Promise<ScanResult[]> {
  const response = await fetch(GET_SCANS_URL, {
    method: "GET"
  });

  if (!response.ok) {
    throw new Error(`Erro ao carregar scans: ${response.status}`);
  }

  const data = await response.json();

  return data.items || [];
}

// ─── Disparar novo scan (POST) ────────────────────────────────────────────────
export async function startScan(url: string): Promise<ScanResult> {
  const res = await fetch(START_SCAN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ url })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({
      error: res.statusText
    }));

    throw new Error(err.error ?? `Erro ${res.status}`);
  }

  return res.json();
}
