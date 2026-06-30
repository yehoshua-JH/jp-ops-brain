/**
 * VoiceContext — global state for the context-aware voice update system.
 *
 * Any page can call setContext() to tell the GlobalVoiceButton which entity
 * the user is currently focused on. When the user taps the mic, the voice
 * update is routed to that entity.
 *
 * Usage from any page:
 *   const { setContext, clearContext } = useVoiceContext();
 *   // When user taps a blocker:
 *   setContext({ entityType: "blocker", entityId: 5, entityName: "Invoice delay" });
 */
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface VoiceEntityContext {
  entityType: "blocker" | "actionItem" | "client" | "employee" | "session" | "domain" | "general";
  entityId?: number;
  entityName?: string;
}

interface VoiceContextValue {
  context: VoiceEntityContext | null;
  setContext: (ctx: VoiceEntityContext) => void;
  clearContext: () => void;
}

const VoiceContext = createContext<VoiceContextValue>({
  context: null,
  setContext: () => {},
  clearContext: () => {},
});

export function VoiceContextProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState<VoiceEntityContext | null>(null);

  const setContext = useCallback((ctx: VoiceEntityContext) => {
    setContextState(ctx);
  }, []);

  const clearContext = useCallback(() => {
    setContextState(null);
  }, []);

  return (
    <VoiceContext.Provider value={{ context, setContext, clearContext }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoiceContext() {
  return useContext(VoiceContext);
}
