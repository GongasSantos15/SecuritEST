interface RiskScoreGaugeProps {
  score: number;
}

export function RiskScoreGauge({ score }: RiskScoreGaugeProps) {
  const getColor = (score: number) => {
    if (score >= 80) return "#16a34a";
    if (score >= 50) return "#ca8a04";
    if (score >= 30) return "#ea580c";
    return "#dc2626";
  };

  const getRiskLevel = (score: number) => {
    if (score >= 80) return "Low Risk";
    if (score >= 50) return "Medium Risk";
    if (score >= 30) return "High Risk";
    return "Critical Risk";
  };

  const color = getColor(score);
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <svg className="transform -rotate-90 w-48 h-48">
          <circle
            cx="96"
            cy="96"
            r="70"
            stroke="#e5e7eb"
            strokeWidth="12"
            fill="none"
          />
          <circle
            cx="96"
            cy="96"
            r="70"
            stroke={color}
            strokeWidth="12"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl" style={{ color }}>{score}</span>
          <span className="text-sm text-muted-foreground">/100</span>
        </div>
      </div>
      <p className="mt-4 text-center" style={{ color }}>{getRiskLevel(score)}</p>
      <p className="text-sm text-muted-foreground text-center mt-1">
        Based on OWASP API Security Top 10
      </p>
    </div>
  );
}
