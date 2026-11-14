import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { getBoostDestination } from '../../lib/boostNavigation';
import { useSupabase } from '../../hooks/useSupabase';
import { PromoSideShortcuts } from './PromoSideShortcuts';
import {
  AUTO_ADVANCE_MS,
  DEFAULT_BANNERS,
  isBannerWithinSchedule,
  resolveActiveBanners,
  resolveBannerAction,
  UUID_REGEX,
  type WebPromoBanner,
} from './promoBannerConfig';

export type { WebPromoBanner };

const SLIDE_ANIMATION_MS = 420;

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
  const animRafRef = useRef<number | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const fallbackSettleRef = useRef<number | null>(null);
  const isInteractingRef = useRef(false);
  const cooldownUntilRef = useRef(0);

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
    const track = trackRef.current;
    if (!track) return;
    track.style.scrollSnapType = 'x mandatory';
    const current = computeNearestSlide(track);
    pendingTargetRef.current = null;
    activeIndexRef.current = current;
    setActiveIndex(current);
    if (settledIndexRef.current !== current) {
      settledIndexRef.current = current;
      const slide = banners[current];
      if (slide) {
        setStatusAnnouncement(`Affiche ${current + 1} sur ${banners.length} : ${slide.title}`);
      }
    }
  }, [banners, computeNearestSlide]);

  const goToSlide = useCallback((targetIndex: number, isManual = false) => {
    const track = trackRef.current;
    if (!track || banners.length <= 1) return;
    if (isManual) cooldownUntilRef.current = Date.now() + 6000;

    const normalized = ((targetIndex % banners.length) + banners.length) % banners.length;
    pendingTargetRef.current = normalized;
    activeIndexRef.current = normalized;
    setActiveIndex(normalized);

    if (animRafRef.current) window.cancelAnimationFrame(animRafRef.current);

    const startLeft = track.scrollLeft;
    const targetLeft = normalized * track.clientWidth;
    const distance = targetLeft - startLeft;
    if (Math.abs(distance) < 2) {
      handleTrackSettle();
      return;
    }

    // Désactive temporairement scroll-snap pendant le glissement JS pour éviter
    // que Chromium n'interrompe la transition horizontale en milieu de course.
    track.style.scrollSnapType = 'none';
    const startedAt = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / SLIDE_ANIMATION_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      track.scrollLeft = startLeft + distance * eased;
      if (progress < 1) {
        animRafRef.current = window.requestAnimationFrame(step);
        return;
      }
      animRafRef.current = null;
      handleTrackSettle();
    };
    animRafRef.current = window.requestAnimationFrame(step);
  }, [banners.length, handleTrackSettle]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const supportsScrollEnd = 'onscrollend' in window;

    const onScroll = () => {
      if (pendingTargetRef.current === null && scrollRafRef.current === null) {
        scrollRafRef.current = window.requestAnimationFrame(() => {
          scrollRafRef.current = null;
          if (!trackRef.current || pendingTargetRef.current !== null) return;
          const nearest = computeNearestSlide(trackRef.current);
          activeIndexRef.current = nearest;
          setActiveIndex((prev) => (prev === nearest ? prev : nearest));
        });
      }
      if (!supportsScrollEnd && pendingTargetRef.current === null) {
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
      if (animRafRef.current) window.cancelAnimationFrame(animRafRef.current);
      if (scrollRafRef.current) window.cancelAnimationFrame(scrollRafRef.current);
      if (fallbackSettleRef.current) window.clearTimeout(fallbackSettleRef.current);
    };
  }, [computeNearestSlide, handleTrackSettle]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = window.setInterval(() => {
      if (isInteractingRef.current || Date.now() < cooldownUntilRef.current) return;
      const base = pendingTargetRef.current ?? activeIndexRef.current;
      goToSlide((base + 1) % banners.length, false);
    }, AUTO_ADVANCE_MS);
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
                cooldownUntilRef.current = Date.now() + 6000;
              }}
              onPointerUp={() => { isInteractingRef.current = false; }}
              onPointerCancel={() => { isInteractingRef.current = false; }}
              style={{ touchAction: 'manipulation' }}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none rounded-3xl border border-slate-200 bg-slate-950 shadow-xs focus-visible:outline-2 focus-visible:outline-orange-600"
            >
              {banners.map((banner, idx) => (
                <div
                  key={banner.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${idx + 1} sur ${banners.length}`}
                  className="w-full shrink-0 snap-center"
                >
                  <button
                    type="button"
                    onClick={() => handleBannerClick(banner)}
                    className="group relative flex h-48 sm:h-56 lg:h-[252px] w-full flex-col justify-between p-4 sm:p-6 text-left"
                  >
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/15" />

                    <div className="relative z-10 flex items-center justify-between gap-2 w-full">
                      {banner.badge_text ? (
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase"
                          style={{ backgroundColor: banner.badge_color || '#EA580C' }}
                        >
                          {banner.badge_text}
                        </span>
                      ) : <span />}

                      <div className="flex items-center gap-1.5">
                        {banner.sponsor_name && (
                          <span className="rounded-full bg-slate-900/75 border border-white/20 px-2.5 py-0.5 text-[10px] font-semibold text-white truncate max-w-[140px]">
                            {banner.sponsor_name}
                          </span>
                        )}
                        {banners.length > 1 && (
                          <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
                            {idx + 1}/{banners.length}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="relative z-10 flex items-end justify-between gap-3 w-full">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h3 className="text-sm sm:text-lg font-black text-white leading-tight line-clamp-1">
                          {banner.title}
                        </h3>
                        {banner.subtitle && (
                          <p className="max-w-lg text-[11px] sm:text-xs text-white/90 font-medium line-clamp-1 sm:line-clamp-2">
                            {banner.subtitle}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-orange-600 px-3 py-1.5 text-[11px] font-bold text-white group-hover:bg-orange-500 transition-colors">
                        <span>Découvrir</span>
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </button>
                </div>
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
