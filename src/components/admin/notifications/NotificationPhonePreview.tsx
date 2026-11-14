import React from 'react';
import type { SegmentedCampaignResponse } from '../../../lib/pushNotifications';
import type { NotificationAudience } from './notificationTemplates.types';
import { formatSamplePreviewText } from './notificationComposerConfig';

interface NotificationPhonePreviewProps {
  audience: NotificationAudience;
  title: string;
  body: string;
  previewResult: SegmentedCampaignResponse | null;
}

export const NotificationPhonePreview: React.FC<NotificationPhonePreviewProps> = ({
  audience,
  title,
  body,
  previewResult,
}) => (
  <div className="space-y-3 pt-1">
    {previewResult && (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs space-y-2">
        <p className="font-bold text-emerald-900 tabular-nums">
          Cible estimée : {previewResult.recipientsCount ?? 0} utilisateur(s) abonné(s)
        </p>
        {previewResult.samples && previewResult.samples.length > 0 && (
          <div className="space-y-1.5">
            {previewResult.samples.map((sample) => (
              <div
                key={sample.userId}
                className="rounded border border-emerald-200/80 bg-white p-2"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  Pour : {sample.recipientName}
                </p>
                <p className="mt-0.5 font-bold text-stone-900">{sample.title}</p>
                <p className="mt-0.5 text-stone-600">{sample.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    <div>
      <p className="mb-1.5 text-xs font-semibold text-stone-500">Aperçu sur téléphone</p>
      <div className="rounded-xl border border-stone-200/80 bg-stone-100/80 p-3">
        <div className="flex items-start gap-3 rounded-lg border border-stone-200/60 bg-white p-3 shadow-2xs">
          <img
            src="/android-chrome-192x192.png"
            alt=""
            className="h-9 w-9 shrink-0 rounded-lg border border-stone-100"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-[11px] text-stone-400">
              <span className="font-semibold text-stone-600">
                {audience === 'delivery' ? 'DaloaDelivery' : 'DaloaMarket'}
              </span>
              <span>maintenant</span>
            </div>
            <p className="mt-0.5 truncate text-xs font-bold text-stone-900">
              {formatSamplePreviewText(title) || 'Titre de votre notification'}
            </p>
            <p className="mt-0.5 line-clamp-3 text-xs text-stone-600">
              {formatSamplePreviewText(body) ||
                'Le contenu de votre message apparaîtra ici en temps réel.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);
