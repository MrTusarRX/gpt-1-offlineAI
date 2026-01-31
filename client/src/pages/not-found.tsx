import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-6">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-12 h-12 text-primary opacity-80" />
        </div>
        
        <h1 className="text-6xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">
          404
        </h1>
        
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          The neural pathway you are looking for has not been formed yet.
        </p>

        <Link href="/">
          <button className="px-8 py-3 rounded-xl bg-primary text-white font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-200">
            Return Home
          </button>
        </Link>
      </div>
    </div>
  );
}
