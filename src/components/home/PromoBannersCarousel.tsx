import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export interface WebPromoBanner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  badge_text: string | null;
  badge_color: string | null;
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
    badge_text: 'NOUVEAU',
    badge_color: '#FF9800',
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
    badge_text: 'BON PLAN',
    badge_color: '#16A34A',
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

  const fetchBanners = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await (supabase.from('promo_banners' as any) as any)
        .select('id, title, subtitle, image_url, badge_text, badge_color, link_type, link_target, is_active, priority, starts_at, ends_at')
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
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [banners.length]);

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
        <div className="relative overflow-hidden rounded-3xl border border-orange-100/80 bg-gray-900 shadow-md">
          <button
            type="button"
            onClick={() => handleBannerClick(currentBanner)}
            className="relative flex h-40 sm:h-44 w-full flex-col justify-between p-4 sm:p-5 text-left transition-transform active:scale-[0.995]"
          >
            <img
              src={currentBanner.image_url}
              alt={currentBanner.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />

            <div className="relative z-10 flex items-center justify-between">
              {currentBanner.badge_text ? (
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider text-white uppercase shadow-xs"
                  style={{ backgroundColor: currentBanner.badge_color || '#FF6B00' }}
                >
                  {currentBanner.badge_text}
                </span>
              ) : <span />}
              {banners.length > 1 && (
                <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold text-white/90 backdrop-blur-xs tabular-nums">
                  {activeIndex + 1}/{banners.length}
                </span>
              )}
            </div>

            <div className="relative z-10 space-y-1">
              <h3 className="text-base sm:text-lg font-black text-white leading-tight line-clamp-1">
                {currentBanner.title}
              </h3>
              {currentBanner.subtitle && (
                <p className="max-w-lg text-xs text-white/90 font-medium line-clamp-2">
                  {currentBanner.subtitle}
                </p>
              )}
              <span className="inline-flex items-center gap-1 pt-1 text-[11px] font-extrabold text-amber-300">
                Découvrir <ArrowRight className="h-3.5 w-3.5" />
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
                className="hidden sm:flex absolute left-2.5 top-1/2 -translate-y-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-xs"
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
                className="hidden sm:flex absolute right-2.5 top-1/2 -translate-y-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-xs"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2.5 right-4 z-20 flex items-center gap-1.5">
                {banners.map((b, idx) => (
                  <button
                    key={b.id}
                    type="button"
                    aria-label={`Aller à l'affiche ${idx + 1}`}
                    onClick={() => setActiveIndex(idx)}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      idx === activeIndex ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/50 hover:bg-white/80'
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
