  import { useState } from "react";
  import { Header } from "./components/Header";
  import { StatsCard } from "./components/StatsCard";
  import { ScanForm } from "./components/ScanForm";
  import { ScanHistoryCard, ScanData } from "./components/ScanHistoryCard";
  import { VulnerabilityCard, Vulnerability } from "./components/VulnerabilityCard";
  import { RiskScoreGauge } from "./components/RiskScoreGauge";
  import {
    Activity,
    AlertTriangle,
    CheckCircle,
    TrendingUp,
    ArrowLeft,
    Download,
    Share2,
    Clock
  } from "lucide-react";

  // Mock data
  const mockVulnerabilities: Vulnerability[] = [
    {
      id: "1",
      title: "Broken Object Level Authorization",
      severity: "critical",
      category: "OWASP API1:2023",
      description: "API endpoints are vulnerable to object level authorization bypass. Attackers can access data belonging to other users by manipulating object IDs.",
      endpoint: "/api/users/{userId}/profile",
      recommendation: "Implement proper authorization checks at the object level. Verify that the authenticated user has permission to access the requested resource."
    },
    {
      id: "2",
      title: "Broken Authentication",
      severity: "high",
      category: "OWASP API2:2023",
      description: "Authentication mechanisms are incorrectly implemented, allowing attackers to compromise authentication tokens or exploit implementation flaws.",
      endpoint: "/api/auth/login",
      recommendation: "Use standard authentication protocols (OAuth 2.0, OpenID Connect). Implement rate limiting, MFA, and secure token management."
    },
    {
      id: "3",
      title: "Excessive Data Exposure",
      severity: "high",
      category: "OWASP API3:2023",
      description: "API returns excessive data in responses, including sensitive information that should not be exposed to the client.",
      endpoint: "/api/users/list",
      recommendation: "Implement response filtering. Only return necessary data fields based on the client's needs and permissions."
    },
    {
      id: "4",
      title: "Lack of Rate Limiting",
      severity: "medium",
      category: "OWASP API4:2023",
      description: "No rate limiting implemented on API endpoints, making the service vulnerable to brute force and DoS attacks.",
      recommendation: "Implement rate limiting based on IP, user, or API key. Use exponential backoff for repeated failed attempts."
    },
    {
      id: "5",
      title: "Security Misconfiguration",
      severity: "medium",
      category: "OWASP API8:2023",
      description: "API servers expose sensitive error messages and stack traces. CORS policy is overly permissive.",
      recommendation: "Disable debug mode in production. Configure proper CORS policies. Remove verbose error messages."
    }
  ];

  const mockScans: ScanData[] = [
    {
      id: "1",
      url: "https://api.example.com/v1/users",
      timestamp: new Date(Date.now() - 3600000),
      riskScore: 78,
      vulnerabilities: 5,
      status: "completed"
    },
    {
      id: "2",
      url: "https://api.test-service.io/v2/products",
      timestamp: new Date(Date.now() - 7200000),
      riskScore: 45,
      vulnerabilities: 3,
      status: "completed"
    },
    {
      id: "3",
      url: "https://staging-api.myapp.com/graphql",
      timestamp: new Date(Date.now() - 86400000),
      riskScore: 92,
      vulnerabilities: 8,
      status: "completed"
    },
    {
      id: "4",
      url: "https://api.payment-gateway.com/v1/transactions",
      timestamp: new Date(Date.now() - 172800000),
      riskScore: 23,
      vulnerabilities: 2,
      status: "completed"
    }
  ];

  export default function App() {
    const [scans, setScans] = useState<ScanData[]>(mockScans);
    const [selectedScan, setSelectedScan] = useState<ScanData | null>(null);

    const handleNewScan = (url: string) => {
      const newScan: ScanData = {
        id: Date.now().toString(),
        url,
        timestamp: new Date(),
        riskScore: Math.floor(Math.random() * 100),
        vulnerabilities: Math.floor(Math.random() * 10),
        status: "completed"
      };
      setScans([newScan, ...scans]);
      setSelectedScan(newScan);
    };

    const totalVulnerabilities = scans.reduce((sum, scan) => sum + scan.vulnerabilities, 0);
    const avgRiskScore = Math.round(scans.reduce((sum, scan) => sum + scan.riskScore, 0) / scans.length);

    if (selectedScan) {
      return (
        <div className="min-h-screen bg-background">
          <Header />

          <main className="container mx-auto px-6 py-8">
            <button
              onClick={() => setSelectedScan(null)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="mb-2">Scan Report</h2>
                      <p className="text-sm text-muted-foreground break-all">{selectedScan.url}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {selectedScan.timestamp.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 rounded-lg border border-border hover:bg-accent transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg border border-border hover:bg-accent transition-colors">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 flex items-center justify-center">
                <RiskScoreGauge score={selectedScan.riskScore} />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="mb-4">Vulnerabilities Detected ({mockVulnerabilities.length})</h3>
              <div className="space-y-4">
                {mockVulnerabilities.map((vuln) => (
                  <VulnerabilityCard key={vuln.id} vulnerability={vuln} />
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="text-foreground mb-2">Azure Cloud Architecture</h4>
              <p className="text-sm text-muted-foreground mb-4">
                This scan was powered by a cloud-native architecture on Microsoft Azure, featuring:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>Azure Container Instances</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>Azure Functions (Serverless)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>Azure Cosmos DB (NoSQL)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>Azure DevOps CI/CD</span>
                </div>
              </div>
            </div>
          </main>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background">
        <Header />

        <main className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <ScanForm onSubmit={handleNewScan} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Scans"
              value={scans.length}
              icon={Activity}
              trend="+12% from last week"
              trendUp={true}
            />
            <StatsCard
              title="Vulnerabilities Found"
              value={totalVulnerabilities}
              icon={AlertTriangle}
              trend="+8 this week"
              trendUp={false}
            />
            <StatsCard
              title="Avg Risk Score"
              value={avgRiskScore}
              icon={TrendingUp}
              trend="-5 points"
              trendUp={true}
            />
            <StatsCard
              title="APIs Secured"
              value={scans.filter(s => s.riskScore < 30).length}
              icon={CheckCircle}
              trend="+2 this week"
              trendUp={true}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3>Recent Scans</h3>
              <button className="text-sm text-primary hover:underline">View All</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scans.map((scan) => (
                <ScanHistoryCard
                  key={scan.id}
                  scan={scan}
                  onClick={() => setSelectedScan(scan)}
                />
              ))}
            </div>
          </div>

          <div className="mt-8 bg-card border border-border rounded-lg p-6">
            <h3 className="mb-4">About SecuritEST</h3>
            <p className="text-sm text-muted-foreground mb-4">
              SecuritEST is a cloud-native API security scanning platform built on Microsoft Azure.
              It automatically analyzes exposed APIs, identifies potential vulnerabilities based on
              OWASP API Security Top 10, and generates comprehensive risk reports.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-accent rounded-lg p-4">
                <h4 className="mb-2">Container-Based</h4>
                <p className="text-muted-foreground">
                  Scalable scanning engine deployed in Azure Container Instances
                </p>
              </div>
              <div className="bg-accent rounded-lg p-4">
                <h4 className="mb-2">Serverless Computing</h4>
                <p className="text-muted-foreground">
                  Azure Functions handle request processing and report generation
                </p>
              </div>
              <div className="bg-accent rounded-lg p-4">
                <h4 className="mb-2">NoSQL Storage</h4>
                <p className="text-muted-foreground">
                  Cosmos DB stores scan history and vulnerability data at scale
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
