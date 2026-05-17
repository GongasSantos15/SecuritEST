import { useState } from "react";
import { Search, Loader2, AlertCircle } from "lucide-react";

interface ScanFormProps {
  onSubmit: (url: string) => Promise<void>;
}

export function ScanForm({ onSubmit }: ScanFormProps) {
  const [url, setUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsScanning(true);
    setError(null);

    try {
      await onSubmit(url.trim());
      setUrl("");
    } catch (err: any) {
      setError(err.message ?? "Erro desconhecido ao realizar o scan.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#1a2f4a] to-[#2d4a6b] rounded-xl p-8 border border-primary/30 text-white">
      <h2 className="text-white mb-2">Analyze API Security</h2>
      <p className="text-white/80 mb-6">
        Submit an API endpoint URL for comprehensive security analysis
      </p>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/v1/..."
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
            disabled={isScanning}
            required
          />
        </div>
        <button
          type="submit"
          disabled={isScanning}
          className="px-6 py-3 bg-white text-[#0f1f3a] rounded-lg hover:bg-white/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Scan API
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 flex items-center gap-2 bg-red-500/20 border border-red-400/40 rounded-lg px-4 py-3 text-sm text-red-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}