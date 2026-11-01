import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Zap, Gift } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export interface WebPromoBanner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  badge_text: string | null;
  badge_color: string | null;
  sponsor_name?: string | null;
  link_type: 'express' | 'referral' | 'listing' | 'seller' | 'external' | 'none';
  link_target: string | null;
  is_active: boolean;
  priority: number;
}

const DEFAULT_BANNERS: WebPromoBanner[] = [
  {
    id: 'default-express',
    title: 'Coursier Express Daloa',
    subtitle: 'Envoi direct de colis, plis et repas entre quartiers dès 500 FCFA',
    image_url: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=900&q=80',
    badge_text: 'EXPRESS · DÈS 500 F',
    badge_color: '#EA580C',
    sponsor_name: 'DaloaDelivery',
    link_type: 'express',
    link_target: null,
    is_active: true,
    priority: 10,
  },
  {
    id: 'default-referral',
    title: 'Programme Daloa Cash',
    subtitle: 'Gagnez 500 FCFA pour chaque ami invité sur DaloaMarket',
    image_url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=900&q=80',
    badge_text: 'BONUS +500 F',
    badge_color: '#16A34A',
    sponsor_name: 'DaloaMarket',
    link_type: 'referral',
    link_target: null,
    is_active: true,
    priority: 5,
  },
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PromoBannersCarousel: React.FC = () => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<WebPromoBanner[]>(DEFAULT_BANNERS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const fetchBanners = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await (supabase.from('promo_banners' as any) as any)
        .select('id, title, subtitle, image_url, badge_text, badge_color, sponsor_name, link_type, link_target, is_active, priority, starts_at, ends_at')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error || !data) return;

      const validBanners = (data as any[]).filter((banner) => {
        if (banner.starts_at && banner.starts_at > now) return false;
        if (banner.ends_at && banner.ends_at < now) return false;
        return true;
      }) as WebPromoBanner[];

      if (validBanners.length > 0) {
        setBanners(validBanners);
      }
    } catch {
      // Repli sur DEFAULT_BANNERS
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [banners.length, isPaused]);

  const handleBannerClick = (banner: WebPromoBanner) => {
    if (UUID_REGEX.test(banner.id)) {
      (supabase as any).rpc('increment_banner_click', { p_banner_id: banner.id }).then(() => {});
    }

    switch (banner.link_type) {
      case 'express':
        navigate('/express');
        return;
      case 'referral':
        navigate('/profile');
        return;
      case 'listing':
        if (banner.link_target) navigate(`/listings/${banner.link_target}`);
        return;
      case 'seller':
        if (banner.link_target) navigate(`/boutique/${banner.link_target}`);
        return;
      case 'external':
        if (banner.link_target) window.open(banner.link_target, '_blank', 'noopener,noreferrer');
        return;
      default:
        return;
    }
  };

  if (banners.length === 0) return null;

  const currentBanner = banners[activeIndex] || banners[0];

  return (
    <section className="px-4 pt-3 pb-1">
      <div className="mx-auto max-w-2xl lg:max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="lg:col-span-8 relative overflow-hidden rounded-3xl border border-orange-100/80 bg-slate-950 shadow-md group"
          >
            <button
              type="button"
              onClick={() => handleBannerClick(currentBanner)}
              className="relative flex h-40 sm:h-48 lg:h-[210px] w-full flex-col justify-between p-4 sm:p-5 text-left transition-transform active:scale-[0.995]"
            >
              <img
                src={currentBanner.image_url}
                alt={currentBanner.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/10" />

              <div className="relative z-10 flex items-center justify-between gap-2 w-full">
                {currentBanner.badge_text ? (
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black tracking-wider text-white uppercase shadow-sm"
                    style={{ backgroundColor: currentBanner.badge_color || '#EA580C' }}
                  >
                    {currentBanner.badge_text}
                  </span>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-1.5">
                  {currentBanner.sponsor_name && (
                    <span className="rounded-full bg-slate-900/70 border border-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs truncate max-w-[150px]">
                      {currentBanner.sponsor_name}
                    </span>
                  )}
                  {banners.length > 1 && (
                    <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white/90 backdrop-blur-xs tabular-nums">
                      {activeIndex + 1}/{banners.length}
                    </span>
                  )}
                </div>
              </div>

              <div className="relative z-10 flex items-end justify-between gap-3 w-full">
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="text-base sm:text-xl font-black text-white leading-tight line-clamp-1 drop-shadow-xs">
                    {currentBanner.title}
                  </h3>
                  {currentBanner.subtitle && (
                    <p className="max-w-lg text-xs text-white/90 font-medium line-clamp-2">
                      {currentBanner.subtitle}
                    </p>
                  )}
                </div>

                <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-md shadow-orange-950/30 group-hover:bg-orange-500 transition-colors">
                  <span>J'en profite</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>

            {banners.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Affiche précédente"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex((prev) => (prev - 1 + banners.length) % banners.length);
                  }}
                  className="hidden sm:flex absolute left-2.5 top-1/2 -translate-y-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/70 backdrop-blur-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Affiche suivante"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex((prev) => (prev + 1) % banners.length);
                  }}
                  className="hidden sm:flex absolute right-2.5 top-1/2 -translate-y-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/70 backdrop-blur-xs"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                  {banners.map((b, idx) => (
                    <button
                      key={b.id}
                      type="button"
                      aria-label={`Aller à l'affiche ${idx + 1}`}
                      onClick={() => setActiveIndex(idx)}
                      className={cn(
                        'h-1.5 rounded-full transition-all',
                        idx === activeIndex ? 'w-6 bg-amber-400' : 'w-1.5 bg-white/50 hover:bg-white/80'
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="hidden lg:flex lg:col-span-4 flex-col gap-3 h-[210px]">
            <button
              type="button"
              onClick={() => navigate('/express')}
              className="flex-1 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 p-3.5 text-left text-white shadow-sm hover:opacity-95 transition-opacity"
            >
              <div className="min-w-0 space-y-0.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase">
                  <Zap className="h-3 w-3" /> Express 30 min
                </span>
                <p className="text-sm font-black leading-tight">Coursier Hors-Market</p>
                <p className="text-[11px] text-orange-100 font-semibold tabular-nums">Colis & repas dès 500 FCFA</p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <ArrowRight className="h-4 w-4" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex-1 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-3.5 text-left text-white shadow-sm hover:opacity-95 transition-opacity"
            >
              <div className="min-w-0 space-y-0.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase">
                  <Gift className="h-3 w-3" /> Bonus Parrainage
                </span>
                <p className="text-sm font-black leading-tight">Programme Daloa Cash</p>
                <p className="text-[11px] text-emerald-100 font-semibold tabular-nums">+500 FCFA par ami invité</p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
