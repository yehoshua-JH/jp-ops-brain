import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import InputProcessor from "./pages/InputProcessor";
import SessionLibrary from "./pages/SessionLibrary";
import DomainTracker from "./pages/DomainTracker";
import ActionItemsBlockers from "./pages/ActionItemsBlockers";
import Reports from "./pages/Reports";
import MasterTimeline from "./pages/MasterTimeline";
import OpsBrain from "./pages/OpsBrain";
import VoiceAssistant from "./pages/VoiceAssistant";
import EmployeeIntelligence from "./pages/EmployeeIntelligence";
import ClientsPage from "./pages/ClientsPage";
import ProcessLibrary from "./pages/ProcessLibrary";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

function Router() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin w-8 h-8 text-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Route path={"*"} component={Home} />;
  }

  return (
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/process"} component={InputProcessor} />
        <Route path={"/library"} component={SessionLibrary} />
        <Route path={"/domains"} component={DomainTracker} />
        <Route path={"/tasks"} component={ActionItemsBlockers} />
        <Route path={"/reports"} component={Reports} />
        <Route path={"/timeline"} component={MasterTimeline} />
        <Route path={"/brain"} component={OpsBrain} />
        <Route path={"/voice"} component={VoiceAssistant} />
        <Route path={"/employees"} component={EmployeeIntelligence} />
        <Route path={"/clients"} component={ClientsPage} />
        <Route path={"/processes"} component={ProcessLibrary} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
