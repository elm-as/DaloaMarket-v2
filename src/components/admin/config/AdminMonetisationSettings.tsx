import React, { useEffect, useState } from 'react';
import { Rocket, Store, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSystemSettings, type PhaseConfig } from '../../../hooks/useSystemSettings';
import { cn } from '../../../lib/utils';
import {
  AdminPageHeader,
  AdminSection,
  AdminToggleRow,
  AdminField,
  AdminButton,
  AdminBadge,
  AdminLoading,
  adminInputClass,
} from '../ui/AdminUI';
import { saveSystemSetting } from './saveSystemSetting';

/** Préréglages : ils remplissent le formulaire, rien n'est enregistré sans « Enregistrer ». */
const PRESETS: Record<0 | 1, Partial<PhaseConfig>> = {
  0: {
    phase: 0,
    allow_cod_for_all: true,
    allow_pickup_for_all: true,
    allow_affiliated_deliverers_for_all: true,
    default_payment_method: 'cod',
    seller_fee_override: 0,
  },
  1: {
    phase: 1,
    allow_cod_for_all: false,
    allow_pickup_for_all: false,
    allow_affiliated_deliverers_for_all: false,
    default_payment_method: 'online',
    seller_fee_override: null,
    // Les services ci-dessus deviennent des avantages Pro : le Pass Pro doit
    // pouvoir s'acheter (il était désactivé en phase 0, le préréglage le laissait tel quel).
    enable_seller_badge: true,
    enable_boost: true,
  },
};

const sameConfig = (a: PhaseConfig, b: PhaseConfig) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Modèle économique : phase de lancement ou de croissance, services ouverts à
 * tous ou réservés au Pro, options payantes et commission vendeur.
 *
 * La limite d'annonces gratuites n'y figure plus : la publication n'est plus
 * limitée ni facturée (les crédits servent uniquement au boost).
 */
export const AdminMonetisationSettings: React.FC = () => {
  const { phaseConfig, loading, refreshSettings } = useSystemSettings();
  const [form, setForm] = useState<PhaseConfig>(phaseConfig);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(phaseConfig), [phaseConfig]);

  const patch = (changes: Partial<PhaseConfig>) => setForm((prev) => ({ ...prev, ...changes }));
  const dirty = !sameConfig(form, phaseConfig);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSystemSetting('phase_config', form);
      toast.success('Modèle économique enregistré, actif immédiatement');
      refreshSettings();
    } catch (err: any) {
      toast.error(err.message || 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLoading />;

  const feePercent = form.seller_fee_override == null ? '' : String(Math.round(form.seller_fee_override * 1000) / 10);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Monétisation"
        description="Phase de la plateforme, services ouverts à tous et options payantes. Effet immédiat, sans redéploiement."
        actions={
          <AdminButton variant="primary" loading={saving} disabled={!dirty} onClick={handleSave}>
            Enregistrer
          </AdminButton>
        }
      />

      <AdminSection
        icon={Rocket}
        title="Phase de la plateforme"
        description="Choisir une phase préremplit les réglages ci-dessous ; ajustez-les puis enregistrez."
        aside={
          <AdminBadge tone="accent">
            En ligne : Phase {phaseConfig.phase} ({phaseConfig.phase === 0 ? 'lancement' : 'croissance'})
          </AdminBadge>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {([0, 1] as const).map((phase) => {
            const active = form.phase === phase;
            return (
              <button
                key={phase}
                type="button"
                onClick={() => patch(PRESETS[phase])}
                className={cn(
                  'rounded-xl border p-4 text-left transition-colors',
                  active
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-50)]'
                    : 'border-gray-200 hover:bg-gray-50'
                )}
              >
                <p className="text-sm font-semibold text-gray-900">
                  Phase {phase} — {phase === 0 ? 'Lancement' : 'Croissance'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {phase === 0
                    ? 'Tout est ouvert à tous les vendeurs, sans commission. Paiement à la livraison par défaut.'
                    : 'Les services avancés sont réservés au Pass Pro. Commission standard. Paiement en ligne par défaut.'}
                </p>
              </button>
            );
          })}
        </div>
      </AdminSection>

      <AdminSection
        icon={Store}
        title="Services ouverts à tous les vendeurs"
        description="Activé : tous les vendeurs y ont accès. Désactivé : réservé aux vendeurs Pass Pro. En phase 0, tout est activé ; en phase 1, tout passe au Pro."
        bodyClassName="divide-y divide-gray-100 py-1"
      >
        <AdminToggleRow
          label="Paiement à la livraison"
          description="Tout vendeur peut proposer le paiement en espèces à la livraison."
          checked={form.allow_cod_for_all}
          onChange={(v) => patch({ allow_cod_for_all: v })}
        />
        <AdminToggleRow
          label="Retrait en boutique"
          description="Les acheteurs peuvent venir chercher l’article sans frais de livraison."
          checked={form.allow_pickup_for_all}
          onChange={(v) => patch({ allow_pickup_for_all: v })}
        />
        <AdminToggleRow
          label="Livreurs affiliés"
          description="Tout vendeur peut inviter ses propres livreurs."
          checked={form.allow_affiliated_deliverers_for_all}
          onChange={(v) => patch({ allow_affiliated_deliverers_for_all: v })}
        />
        <div className="py-3">
          <AdminField label="Mode de paiement présélectionné à la commande" htmlFor="default-payment">
            <select
              id="default-payment"
              value={form.default_payment_method}
              onChange={(e) => patch({ default_payment_method: e.target.value as PhaseConfig['default_payment_method'] })}
              className={adminInputClass}
            >
              <option value="cod">Paiement à la livraison</option>
              <option value="online">Paiement en ligne</option>
            </select>
          </AdminField>
        </div>
      </AdminSection>

      <AdminSection
        icon={Sparkles}
        title="Options payantes et commission"
        bodyClassName="divide-y divide-gray-100 py-1"
      >
        <AdminToggleRow
          label="Boost d’annonces"
          description="Mise en avant payée en crédits (packs de 500, 1 000 et 2 000 F)."
          checked={form.enable_boost}
          onChange={(v) => patch({ enable_boost: v })}
        />
        <AdminToggleRow
          label="Pass Vendeur Pro"
          description="Abonnement à 2 500 F par mois ou 25 000 F par an."
          checked={form.enable_seller_badge}
          onChange={(v) => patch({ enable_seller_badge: v })}
        />
        <div className="py-3">
          <AdminField
            label="Commission vendeur imposée (%)"
            hint="Vide : taux standard (3,5 %, ou 2,5 % pour un vendeur Pro). 0 : aucune commission."
            htmlFor="seller-fee"
          >
            <input
              id="seller-fee"
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={feePercent}
              placeholder="Taux standard"
              onChange={(e) =>
                patch({
                  seller_fee_override: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) / 100,
                })
              }
              className={`${adminInputClass} max-w-[160px]`}
            />
          </AdminField>
        </div>
      </AdminSection>
    </div>
  );
};
