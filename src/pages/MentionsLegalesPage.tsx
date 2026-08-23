import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Globe, Shield, Mail, MapPin, User, Phone, Server } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { Card } from '../components/ui/Card';

export default function MentionsLegalesPage() {
  const navigate = useNavigate();
  usePageTitle('Mentions Légales — DaloaMarket');

  return (
    <div className="min-h-screen bg-gray-50/70 px-4 py-5 pb-28 sm:px-6 sm:py-8 lg:px-6">
      <Card className="mx-auto max-w-3xl p-5 sm:p-7 lg:p-10 rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50">
        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 px-5 py-6 text-center text-white mb-6">
          <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 bg-white rounded-2xl p-2 shadow-lg">
            <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight mb-2">
            Mentions Légales
          </h1>
          <p className="text-xs sm:text-sm text-orange-100 max-w-lg mx-auto">
            Informations légales et techniques relatives à la marketplace DaloaMarket et à son écosystème.
          </p>
        </div>

        <div className="space-y-6 sm:space-y-8 text-[var(--color-on-surface)]">
          {/* Section 1 */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5 text-[var(--color-primary)]">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold mb-3">1. Informations Générales & Éditeur</h2>
                <div className="space-y-3 text-xs sm:text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>
                    La plateforme accessible à l'adresse <strong>daloamarket.com</strong> (ci-après « DaloaMarket ») est une marketplace e-commerce et de petites annonces hyper-locales dédiée à la ville de Daloa et sa région (Côte d'Ivoire), co-fondée et développée par <strong>OULOBO Elmas Tresor</strong> (ElmasCore), aux côtés d'<strong>Armand J.</strong> et de <strong>Diomandé (alias DNPH)</strong> en charge du pôle communication et du déploiement opérationnel.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                      <User className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0" />
                      <div>
                        <p className="font-bold text-xs text-gray-900">Fondateur & Lead Dev</p>
                        <p className="text-xs text-gray-600">OULOBO Elmas Tresor (Elmas)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                      <User className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0" />
                      <div>
                        <p className="font-bold text-xs text-gray-900">Pôle Communication & Terrain</p>
                        <p className="text-xs text-gray-600">Armand J. & Diomandé (DNPH)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                      <MapPin className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0" />
                      <div>
                        <p className="font-bold text-xs text-gray-900">Implantation & Activité</p>
                        <p className="text-xs text-gray-600">Daloa / Abidjan, Côte d'Ivoire</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                      <Mail className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0" />
                      <div>
                        <p className="font-bold text-xs text-gray-900">E-mails Officiels</p>
                        <p className="text-xs text-gray-600">contact@daloamarket.com</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5 text-[var(--color-primary)]">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold mb-3">2. Hébergement & Infrastructure Technique</h2>
                <div className="space-y-3 text-xs sm:text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>L'infrastructure globale de DaloaMarket repose sur des services cloud haute disponibilité :</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                      <p className="text-xs font-bold text-gray-900">Frontend Marketplace & CDN</p>
                      <p className="text-xs text-gray-600 mt-0.5">Netlify / Vercel (Edge Distribution)</p>
                      <a href="https://daloamarket.com" className="text-[11px] text-[var(--color-primary)] hover:underline">daloamarket.com</a>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                      <p className="text-xs font-bold text-gray-900">Base de Données & Auth</p>
                      <p className="text-xs text-gray-600 mt-0.5">Supabase, Inc. (PostgreSQL Chiffré & RLS)</p>
                      <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--color-primary)] hover:underline">supabase.com</a>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                      <p className="text-xs font-bold text-gray-900">Microservice Paiements (Escrow)</p>
                      <p className="text-xs text-gray-600 mt-0.5">Railway / Render (Node.js API)</p>
                      <a href="https://api.daloamarket.com" className="text-[11px] text-[var(--color-primary)] hover:underline">api.daloamarket.com</a>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                      <p className="text-xs font-bold text-gray-900">Agrégateur Mobile Money</p>
                      <p className="text-xs text-gray-600 mt-0.5">Money Fusion (Wave, Orange, MTN, Moov)</p>
                      <a href="https://pay.moneyfusion.net" target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--color-primary)] hover:underline">pay.moneyfusion.net</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0 mt-0.5 text-[var(--color-primary)]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold mb-3">3. Propriété Intellectuelle</h2>
                <div className="space-y-2 text-xs sm:text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  <p>
                    L'ensemble de l'écosystème DaloaMarket, son nom, sa marque, son design graphique, son logo, son code source et ses fonctionnalités sont la propriété exclusive d'<strong>ElmasCore (OULOBO Elmas Tresor)</strong>.
                  </p>
                  <p>
                    Toute reproduction ou exploitation non autorisée du site ou de ses éléments constitutifs est passible de poursuites conformément aux législations ivoiriennes et internationales relatives à la propriété intellectuelle.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
          <p>© {new Date().getFullYear()} DaloaMarket · Tous droits réservés · Propriété exclusive d'ElmasCore.</p>
        </div>
      </Card>
    </div>
  );
}
