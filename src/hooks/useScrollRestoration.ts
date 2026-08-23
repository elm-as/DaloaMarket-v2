import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// In-memory cache for scroll positions across page navigations with sessionStorage backup
const scrollPositions = new Map<string, number>();

const getStorageKey = (key: string) => `dm_scroll_pos_${key}`;

export const getSavedScrollPosition = (key: string): number => {
  if (scrollPositions.has(key)) {
    const val = scrollPositions.get(key) || 0;
    if (val > 0) return val;
  }
  try {
    const saved = sessionStorage.getItem(getStorageKey(key));
    if (saved) {
      const val = parseInt(saved, 10);
      if (!isNaN(val) && val > 0) {
        scrollPositions.set(key, val);
        return val;
      }
    }
  } catch {}
  return 0;
};

export const setSavedScrollPosition = (key: string, y: number): void => {
  if (y <= 0) return;
  scrollPositions.set(key, y);
  try {
    sessionStorage.setItem(getStorageKey(key), y.toString());
  } catch {}
};

/**
 * Ironclad Scroll Restoration Hook:
 * 1. Captures scroll on every click/tap BEFORE route change occurs.
 * 2. Ignores synthetic/programmatic scroll events so target values are never overwritten with 0.
 * 3. Actively restores and maintains scroll position on 'POP' (Back) navigation until content paints.
 */
export const useScrollRestoration = () => {
  const location = useLocation();
  const navType = useNavigationType();
  const locationKey = `${location.pathname}${location.search}`;

  const currentKeyRef = useRef(locationKey);
  const isProgrammaticScrollRef = useRef(false);
  const isRestoringRef = useRef(false);
  const restoreIntervalRef = useRef<number | null>(null);

  // Disable default browser scroll restoration so it doesn't fight React Router
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // 1. CAPTURE SCROLL INSTANTLY ON USER CLICK/TOUCH (BEFORE NAVIGATION)
  useEffect(() => {
    const handleUserInteraction = () => {
      const currentPath = window.location.pathname + window.location.search;
      const y = window.scrollY;
      if (y > 0) {
        setSavedScrollPosition(currentPath, y);
      }
    };

    window.addEventListener('click', handleUserInteraction, { capture: true, passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { capture: true, passive: true });
    return () => {
      window.removeEventListener('click', handleUserInteraction, { capture: true });
      window.removeEventListener('touchstart', handleUserInteraction, { capture: true });
    };
  }, []);

  // 2. LIVE PASSIVE SCROLL TRACKING
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current || isRestoringRef.current) return;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!isProgrammaticScrollRef.current && !isRestoringRef.current) {
            const currentPath = window.location.pathname + window.location.search;
            const y = window.scrollY;
            if (y > 0) {
              setSavedScrollPosition(currentPath, y);
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 3. HANDLE ROUTE CHANGE
  useLayoutEffect(() => {
    const currentKey = `${location.pathname}${location.search}`;

    // Clear any active restoration polling
    if (restoreIntervalRef.current) {
      window.clearInterval(restoreIntervalRef.current);
      restoreIntervalRef.current = null;
    }

    currentKeyRef.current = currentKey;

    if (navType === 'PUSH') {
      isProgrammaticScrollRef.current = true;
      isRestoringRef.current = false;
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

      // Unset programmatic flag after scroll event settles
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 100);
    } else if (navType === 'POP') {
      const targetY = getSavedScrollPosition(currentKey);

      if (targetY > 0) {
        isRestoringRef.current = true;
        isProgrammaticScrollRef.current = true;

        // Immediate scroll attempt
        window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });

        const startTime = Date.now();
        const maxDurationMs = 3000;

        restoreIntervalRef.current = window.setInterval(() => {
          const elapsed = Date.now() - startTime;
          const currentY = window.scrollY;

          if (Math.abs(currentY - targetY) > 5 && elapsed < maxDurationMs) {
            window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
          } else {
            if (restoreIntervalRef.current) {
              window.clearInterval(restoreIntervalRef.current);
              restoreIntervalRef.current = null;
            }
            setTimeout(() => {
              isRestoringRef.current = false;
              isProgrammaticScrollRef.current = false;
            }, 150);
          }
        }, 30);
      } else {
        isRestoringRef.current = false;
        isProgrammaticScrollRef.current = false;
      }
    }
  }, [location.pathname, location.search, navType]);
};
