import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { getBoostDestination } from '../../lib/boostNavigation';
import { useSupabase } from '../../hooks/useSupabase';
import { PromoSideShortcuts } from './PromoSideShortcuts';
import { PromoBannerSlide } from './PromoBannerSlide';
import {
  AUTO_ADVANCE_MS,
  DEFAULT_BANNERS,
  glideTrackHorizontally,
  isBannerWithinSchedule,
  resolveActiveBanners,
  resolveBannerAction,
  UUID_REGEX,
  type WebPromoBanner,
} from './promoBannerConfig';

export type { WebPromoBanner };

const AUTO_GLIDE_MS = 2400;
const MANUAL_GLIDE_MS = 800;

export const PromoBannersCarousel: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useSupabase();
  const boostDestination = getBoostDestination(Boolean(user), userProfile, {
    login: '/login',
    myListings: '/profile?tab=listings',
    packs: '/acheter-pack',
  });

  const [banners, setBanners] = useState<WebPromoBanner[]>(DEFAULT_BANNERS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [statusAnnouncement, setStatusAnnouncement] = useState('');

  const trackRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const pendingTargetRef = useRef<number | null>(null);
  const settledIndexRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const wrappedForwardRef = useRef(false);
  const animRafRef = useRef<number | null>(null);
  const settleFrameRef = useRef<number | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const fallbackSettleRef = useRef<number | null>(null);
  const isInteractingRef = useRef(false);
  const cooldownUntilRef = useRef(0);
  const lastSettledAtRef = useRef(Date.now());

  const unparkFirstSlide = useCallback((resetScrollToStart = false) => {
    const track = trackRef.current;
    if (!track || !wrappedForwardRef.current) return;
    const firstSlide = track.firstElementChild as HTMLElement | null;
    if (firstSlide) firstSlide.style.order = '';
    if (resetScrollToStart) track.scrollLeft = 0;
    wrappedForwardRef.current = false;
  }, []);

  const cancelRunningGlide = useCallback(() => {
    if (animRafRef.current) window.cancelAnimationFrame(animRafRef.current);
    if (settleFrameRef.current) window.cancelAnimationFrame(settleFrameRef.current);
    if (fallbackSettleRef.current) window.clearTimeout(fallbackSettleRef.current);
    animRafRef.current = null;
    settleFrameRef.current = null;
    isAnimatingRef.current = false;
    unparkFirstSlide(false);
  }, [unparkFirstSlide]);

  const announceSlide = useCallback((idx: number) => {
    if (settledIndexRef.current === idx) return;
    settledIndexRef.current = idx;
    const slide = banners[idx];
    if (slide) {
      setStatusAnnouncement(`Affiche ${idx + 1} sur ${banners.length} : ${slide.title}`);
    }
  }, [banners]);

  const fetchBanners = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from('promo_banners' as any) as any)
        .select('id, title, subtitle, image_url, badge_text, badge_color, sponsor_name, link_type, link_target, is_active, priority, starts_at, ends_at')
        .eq('is_active', true)
        .neq('link_type', 'referral')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error || !data) return;

      const valid = (data as any[]).filter((b) =>
        isBannerWithinSchedule(b.starts_at, b.ends_at),
      ) as WebPromoBanner[];

      setBanners(resolveActiveBanners(valid));
    } catch {
      // Conservation de DEFAULT_BANNERS
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const computeNearestSlide = useCallback((track: HTMLDivElement): number => {
    const width = track.clientWidth || 1;
    const idx = Math.round(track.scrollLeft / width);
    return Math.max(0, Math.min(idx, banners.length - 1));
  }, [banners.length]);

  const handleTrackSettle = useCallback(() => {
    // Ne jamais réactiver scroll-snap pendant qu'un glissement JS est en cours,
    // sinon Chrome scrollend déclenche un snap brutal et fait trembler la piste.
    if (isAnimatingRef.current) return;
    const track = trackRef.current;
    if (!track) return;
    track.style.scrollSnapType = '';
    track.style.scrollBehavior = '';
    const current = computeNearestSlide(track);
    pendingTargetRef.current = null;
    activeIndexRef.current = current;
    setActiveIndex(current);
    announceSlide(current);
  }, [announceSlide, computeNearestSlide]);

  const goToSlide = useCallback((targetIndex: number, isManual = false) => {
    const track = trackRef.current;
    if (!track || banners.length <= 1) return;
    if (isManual) cooldownUntilRef.current = Date.now() + 5500;

    cancelRunningGlide();

    const prevIndex = activeIndexRef.current;
    const normalized = ((targetIndex % banners.length) + banners.length) % banners.length;
    const shouldWrapLeftward = !isManual && prevIndex === banners.length - 1 && normalized === 0;

    pendingTargetRef.current = normalized;
    activeIndexRef.current = normalized;
    setActiveIndex(normalized);

    let targetLeft = (track.children[normalized] as HTMLElement | undefined)?.offsetLeft ?? normalized * track.clientWidth;

    if (shouldWrapLeftward && track.firstElementChild) {
      const firstSlide = track.firstElementChild as HTMLElement;
      track.style.scrollSnapType = 'none';
      track.style.overflowX = 'hidden';
      firstSlide.style.order = '1';
      wrappedForwardRef.current = true;
      const slideWidth = track.clientWidth;
      track.scrollLeft = Math.max(0, (banners.length - 2) * slideWidth);
      targetLeft = (banners.length - 1) * slideWidth;
    }

    isAnimatingRef.current = true;

    glideTrackHorizontally({
      track,
      targetLeft,
      durationMs: isManual ? MANUAL_GLIDE_MS : AUTO_GLIDE_MS,
      onFrameHandle: (id) => { animRafRef.current = id; },
      onComplete: () => {
        unparkFirstSlide(true);
        settleFrameRef.current = window.requestAnimationFrame(() => {
          settleFrameRef.current = window.requestAnimationFrame(() => {
            settleFrameRef.current = null;
            isAnimatingRef.current = false;
            lastSettledAtRef.current = Date.now();
            track.style.scrollSnapType = '';
            track.style.overflowX = '';
            track.style.scrollBehavior = '';
            pendingTargetRef.current = null;
            announceSlide(normalized);
          });
        });
      },
    });
  }, [announceSlide, banners.length, cancelRunningGlide, unparkFirstSlide]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const supportsScrollEnd = 'onscrollend' in window;

    const onScroll = () => {
      if (isAnimatingRef.current || pendingTargetRef.current !== null) return;
      if (scrollRafRef.current === null) {
        scrollRafRef.current = window.requestAnimationFrame(() => {
          scrollRafRef.current = null;
          if (!trackRef.current || isAnimatingRef.current || pendingTargetRef.current !== null) return;
          const nearest = computeNearestSlide(trackRef.current);
          activeIndexRef.current = nearest;
          setActiveIndex((prev) => (prev === nearest ? prev : nearest));
        });
      }
      if (!supportsScrollEnd) {
        if (fallbackSettleRef.current) window.clearTimeout(fallbackSettleRef.current);
        fallbackSettleRef.current = window.setTimeout(handleTrackSettle, 140);
      }
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    if (supportsScrollEnd) {
      track.addEventListener('scrollend', handleTrackSettle);
    }

    return () => {
      track.removeEventListener('scroll', onScroll);
      if (supportsScrollEnd) track.removeEventListener('scrollend', handleTrackSettle);
      cancelRunningGlide();
      if (scrollRafRef.current) window.cancelAnimationFrame(scrollRafRef.current);
    };
  }, [cancelRunningGlide, computeNearestSlide, handleTrackSettle]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = window.setInterval(() => {
      if (isInteractingRef.current || isAnimatingRef.current) return;
      if (Date.now() < cooldownUntilRef.current) return;
      if (Date.now() - lastSettledAtRef.current < AUTO_ADVANCE_MS) return;
      const base = pendingTargetRef.current ?? activeIndexRef.current;
      goToSlide((base + 1) % banners.length, false);
    }, 500);
    return () => window.clearInterval(timer);
  }, [banners.length, goToSlide]);

  const handleBannerClick = (banner: WebPromoBanner) => {
    if (UUID_REGEX.test(banner.id)) {
      (supabase as any).rpc('increment_banner_click', { p_banner_id: banner.id }).then(() => {});
    }
    const action = resolveBannerAction(banner, boostDestination);
    if (action.externalUrl) {
      window.open(action.externalUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (action.internalRoute) {
      navigate(action.internalRoute);
    }
  };

  if (banners.length === 0) return null;

  return (
    <section
      className="px-4 pt-3 pb-1"
      aria-roledescription="carousel"
      aria-label="Affiches et offres DaloaMarket"
    >
      <div className="mx-auto max-w-2xl lg:max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-8 relative">
            {banners.length > 1 && (
              <div className="pointer-events-none absolute inset-x-2.5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Affiche précédente"
                  onClick={() => goToSlide((pendingTargetRef.current ?? activeIndexRef.current) - 1, true)}
                  style={{ touchAction: 'manipulation' }}
                  className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/60 text-white hover:bg-slate-950/85 focus-visible:outline-2 focus-visible:outline-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Affiche suivante"
                  onClick={() => goToSlide((pendingTargetRef.current ?? activeIndexRef.current) + 1, true)}
                  style={{ touchAction: 'manipulation' }}
                  className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/60 text-white hover:bg-slate-950/85 focus-visible:outline-2 focus-visible:outline-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <div
              ref={trackRef}
              tabIndex={0}
              role="group"
              aria-label="Affiches"
              onPointerDown={() => {
                isInteractingRef.current = true;
                cooldownUntilRef.current = Date.now() + 5500;
                if (isAnimatingRef.current && trackRef.current) {
                  cancelRunningGlide();
                  pendingTargetRef.current = null;
                  trackRef.current.style.scrollSnapType = '';
                  trackRef.current.style.scrollBehavior = '';
                }
              }}
              onPointerUp={() => { isInteractingRef.current = false; }}
              onPointerCancel={() => { isInteractingRef.current = false; }}
              onPointerLeave={() => { isInteractingRef.current = false; }}
              style={{ touchAction: 'manipulation' }}
              className="relative flex overflow-x-auto snap-x snap-mandatory scrollbar-none rounded-3xl border border-slate-200 bg-slate-950 shadow-xs focus-visible:outline-2 focus-visible:outline-orange-600"
            >
              {banners.map((banner, idx) => (
                <PromoBannerSlide
                  key={banner.id}
                  banner={banner}
                  index={idx}
                  total={banners.length}
                  onSelect={handleBannerClick}
                />
              ))}
            </div>

            <p className="sr-only" role="status" aria-live="polite">
              {statusAnnouncement}
            </p>

            {banners.length > 1 && (
              <nav aria-label="Choisir une affiche" className="mt-2.5 flex items-center justify-center gap-1.5">
                {banners.map((banner, idx) => (
                  <button
                    key={`marker-${banner.id}`}
                    type="button"
                    aria-label={`Afficher : ${banner.title}`}
                    aria-current={idx === activeIndex ? 'true' : undefined}
                    onClick={() => goToSlide(idx, true)}
                    style={{ touchAction: 'manipulation' }}
                    className={cn(
                      'h-2 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-orange-600',
                      idx === activeIndex ? 'w-5 bg-orange-600' : 'w-2 bg-slate-300 hover:bg-slate-400',
                    )}
                  />
                ))}
              </nav>
            )}
          </div>

          <PromoSideShortcuts
            onOpenExpress={() => navigate('/express')}
            onOpenBoost={() => navigate(boostDestination)}
          />
        </div>
      </div>
    </section>
  );
};
