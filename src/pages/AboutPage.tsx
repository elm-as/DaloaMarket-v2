import { Info, MapPin, Mail, Globe, Shield, Server, User, Building } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { Card } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';

export default function AboutPage() {
  usePageTitle('A propos — Mentions légales');

  return (
    <div className="max-w-2xl lg:max-w-none mx-auto px-4 py-8 pb-20 lg:px-6">
      <Card className="p-6 lg:p-10 rounded-2xl shadow-elevation-1">
        <div className="text-center mb-8">
          <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4 overflow-hidden">
            <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">DaloaMarket</h1>
          <p className="text-[var(--color-on-surface-variant)] mt-1">
            La marketplace de proximité à Daloa, Côte d'Ivoire
          </p>
        </div>

        <p className="text-[var(--color-on-surface)] leading-relaxed mb-8">
          DaloaMarket est une plateforme ivoirienne de petites annonces locales, fondée en 2025 et dédiée à la ville de Daloa (centre-ouest de la Côte d'Ivoire). Notre mission est de connecter les vendeurs locaux avec les acheteurs, de faciliter le commerce de proximité et de promouvoir l'économie locale. La publication d'annonces est gratuite jusqu'à 10 annonces actives simultanément pour les comptes Vendeurs Standards (et illimitée avec le Pass Vendeur Pro).
        </p>

        <SectionHeader title="Nos fonctionnalités" />
        <div className="mt-3 space-y-3 mb-8">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <p className="text-[var(--color-on-surface)] text-sm leading-relaxed">
              <strong>Paiement sécurisé avec escrow :</strong> Système de tiers de confiance via Money Fusion pour protéger acheteurs et vendeurs (frais acheteur de 3% et commission vendeur de 3,5%).
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Globe size={20} className="text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <p className="text-[var(--color-on-surface)] text-sm leading-relaxed">
              <strong>Livraison intégrée :</strong> Partenariat avec DaloaDelivery pour des livraisons fiables avec géolocalisation et code de vérification.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Shield size={20} className="text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <p className="text-[var(--color-on-surface)] text-sm leading-relaxed">
              <strong>Boutiques personnalisées :</strong> Chaque vendeur peut créer sa boutique avec bannière, logo, description et thème personnalisé.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Server size={20} className="text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <p className="text-[var(--color-on-surface)] text-sm leading-relaxed">
              <strong>Panier multi-articles :</strong> Ajoutez plusieurs articles au panier et passez commande en une seule fois.
            </p>
          </div>
        </div>

        <SectionHeader title="Notre mission" />
        <div className="mt-3 space-y-3 mb-8">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <p className="text-[var(--color-on-surface)] text-sm leading-relaxed">
              Simplifier le commerce local en offrant une plateforme accessible, sécurisée et adaptée aux besoins des habitants de Daloa et de ses environs.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Globe size={20} className="text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <p className="text-[var(--color-on-surface)] text-sm leading-relaxed">
              Promouvoir les produits et services locaux auprès d'un large public, tout en garantissant une expérience utilisateur fluide sur mobile comme sur ordinateur.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Shield size={20} className="text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <p className="text-[var(--color-on-surface)] text-sm leading-relaxed">
              Offrir un environnement de confiance avec messagerie intégrée, système d'avis, profils vendeurs vérifiés et modération proactive des contenus.
            </p>
          </div>
        </div>

        <SectionHeader title="Mentions légales" />
        <div className="mt-3 space-y-4 text-sm text-[var(--color-on-surface-variant)] leading-relaxed mb-8">
          <div className="flex items-start gap-3">
            <Building className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-[var(--color-on-surface)]">Éditeur du site</h4>
              <p>
                Le site <strong>daloamarket.shop</strong> est édité par <strong>ELMAS</strong>, entreprise individuelle de droit ivoirien.
              </p>
              <p>Siège social : Daloa, Côte d'Ivoire.</p>
              <p>Contact : <a href="mailto:support@daloamarket.shop" className="text-[var(--color-primary)] underline">support@daloamarket.shop</a></p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-[var(--color-on-surface)]">Directeur de la publication</h4>
              <p>Le directeur de la publication est le responsable légal de la société ELMAS, joignable à l'adresse email ci-dessus.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Server className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-[var(--color-on-surface)]">Hébergement</h4>
              <p>
                Le site est hébergé par <strong>Netlify, Inc.</strong>, 44 Montgomery Street, Suite 300, San Francisco, California 94104, États-Unis.
              </p>
              <p>
                La base de données est hébergée par <strong>Supabase, Inc.</strong>, 525 Brannan Street, Suite 300, San Francisco, CA 94107, États-Unis.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-[var(--color-on-surface)]">Propriété intellectuelle</h4>
              <p>
                L'ensemble des éléments constituant le site (textes, graphismes, logo, code source, base de données) est la propriété exclusive de DaloaMarket / ELMAS et est protégé par les lois ivoiriennes et internationales relatives à la propriété intellectuelle. Toute reproduction, modification, diffusion ou exploitation commerciale sans autorisation écrite préalable est strictement interdite.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Globe className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-[var(--color-on-surface)]">Protection des données personnelles</h4>
              <p>
                Conformément à la loi ivoirienne relative à la protection des données à caractère personnel, vous disposez d'un droit d'accès, de rectification, d'opposition et de suppression des données vous concernant. Pour exercer ces droits, contactez-nous à <a href="mailto:support@daloamarket.shop" className="text-[var(--color-primary)] underline">support@daloamarket.shop</a>. Consultez notre <a href="/privacy" className="text-[var(--color-primary)] underline">Politique de Confidentialité</a> pour plus de détails.
              </p>
            </div>
          </div>
        </div>

        <SectionHeader title="Contact" />
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail size={18} className="text-[var(--color-on-surface-variant)]" />
            <span className="text-[var(--color-on-surface)]">support@daloamarket.shop</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MapPin size={18} className="text-[var(--color-on-surface-variant)]" />
            <span className="text-[var(--color-on-surface)]">Daloa, Côte d'Ivoire</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Globe size={18} className="text-[var(--color-on-surface-variant)]" />
            <span className="text-[var(--color-on-surface)]">daloamarket.shop</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
