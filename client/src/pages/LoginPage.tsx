import { Brain, Shield, Zap, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";

export default function LoginPage() {
  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">JivePilot</h1>
            <p className="text-xs text-muted-foreground">Ops Intelligence Hub</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-foreground mb-2">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Sign in to access your operational intelligence dashboard, session history, and team insights.
          </p>

          {/* Feature highlights */}
          <div className="space-y-3 mb-8">
            {[
              { icon: BarChart3, label: "Command Center", desc: "Live domain health & KPIs" },
              { icon: Brain, label: "Ops Brain", desc: "AI-powered Q&A on your data" },
              { icon: Zap, label: "Voice Assistant", desc: "Speak to query your operations" },
              { icon: Shield, label: "Risk Tracking", desc: "Blockers, clients & team risks" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-violet-600/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <span className="font-medium text-foreground">{label}</span>
                  <span className="text-muted-foreground"> — {desc}</span>
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={handleLogin}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold h-11 rounded-xl shadow-lg shadow-violet-600/20 transition-all duration-150 active:scale-[0.97]"
          >
            Sign in with Manus
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Secure login via Manus OAuth — no password required
          </p>
        </div>
      </div>
    </div>
  );
}
