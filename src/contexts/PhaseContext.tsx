import React, { createContext, useContext, useMemo } from 'react';
import { useSystemSettings, type PhaseConfig } from '../hooks/useSystemSettings';

// ─── Derived helpers ────────────────────────────────────────────────────────
// These mirror what featureFlags.ts used to compute statically, but now
// they react to the live PhaseConfig pushed from Supabase.

export interface PhaseContextValue {
  /** Raw phase config from Supabase (or defaults) */
  phaseConfig: PhaseConfig;

  /** true when the marketplace runs in "Phase 0 — free launch" mode */
  isPhase0: boolean;

  /** Monetisation pages/routes should be visible */
  showMonetisation: boolean;

  /** Max free listings allowed for standard sellers */
  maxFreeListings: number;

  /** Feature toggles derived from phaseConfig */
  enableBoost: boolean;
  enableBump: boolean;
  enableSellerBadge: boolean;
}

const PhaseContext = createContext<PhaseContextValue | null>(null);

/**
 * Provider that wraps the app and exposes the live PhaseConfig
 * as a React Context, replacing all static PHASE0_FREE_MODE checks.
 */
export function PhaseProvider({ children }: { children: React.ReactNode }) {
  const { phaseConfig } = useSystemSettings();

  const value = useMemo<PhaseContextValue>(() => {
    const isPhase0 = phaseConfig.phase === 0;

    return {
      phaseConfig,
      isPhase0,
      showMonetisation: !isPhase0,
      maxFreeListings: isPhase0 ? Number.POSITIVE_INFINITY : phaseConfig.max_free_listings,
      enableBoost: phaseConfig.enable_boost,
      enableBump: phaseConfig.enable_bump,
      enableSellerBadge: isPhase0 ? false : phaseConfig.enable_seller_badge,
    };
  }, [phaseConfig]);

  return (
    <PhaseContext.Provider value={value}>
      {children}
    </PhaseContext.Provider>
  );
}

/**
 * Hook to consume the live phase context.
 * Must be called inside <PhaseProvider>.
 */
export function usePhase(): PhaseContextValue {
  const ctx = useContext(PhaseContext);
  if (!ctx) {
    throw new Error('usePhase must be used within a <PhaseProvider>');
  }
  return ctx;
}
