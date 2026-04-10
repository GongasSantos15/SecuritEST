import { Github } from "lucide-react";
import image0 from "../../imports/image0.png";

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={image0} alt="SecuritEST Logo" className="w-15 h-15 rounded-lg" />
            <div>
              <h1 className="text-foreground">SecuritEST</h1>
              <p className="text-xs text-muted-foreground">API Security Scanner</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
