import React from 'react';
import { Send, Bell, Zap, Bookmark, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { NotificationTemplateSelector } from './notifications/NotificationTemplateSelector';
import { NotificationBroadcastHistory } from './notifications/NotificationBroadcastHistory';
import { NotificationPhonePreview } from './notifications/NotificationPhonePreview';
import { useAdminNotificationsComposer } from './notifications/useAdminNotificationsComposer';
import {
  AUDIENCES,
  BODY_MAX,
  DYNAMIC_VARIABLES,
  QUICK_LINKS,
  TITLE_MAX,
} from './notifications/notificationComposerConfig';
import {
  AdminPageHeader,
  AdminSection,
  AdminField,
  AdminButton,
  adminInputClass,
} from './ui/AdminUI';

export const AdminNotificationsTab: React.FC = () => {
  const {
    audience,
    setAudience,
    templateId,
    title,
    setTitle,
    body,
    setBody,
    url,
    setUrl,
    setFocusedField,
    sending,
    previewing,
    campaignPreview,
    runningNudges,
    history,
    allTemplates,
    saveTemplate,
    deleteTemplate,
    canSend,
    handleRunBehavioralNudges,
    handleApplyTemplate,
    handleInsertVariable,
    handleSaveCurrentAsTemplate,
    handlePreviewTarget,
    handleSend,
  } = useAdminNotificationsComposer();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Notifications Push"
        description="Diffusion globale et campagnes segmentées avec variables dynamiques ($nom, $lien, $numero, $chaine)."
        actions={
          <AdminButton
            type="button"
            variant="secondary"
            icon={Zap}
            loading={runningNudges}
            onClick={handleRunBehavioralNudges}
          >
            Relances automatiques
          </AdminButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,390px]">
        <AdminSection
          icon={Bell}
          title="Rédiger et diffuser"
          description="Composez votre message ou cliquez sur un modèle à droite pour pré-remplir."
          footer={
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={!title.trim() || !body.trim()}
                onClick={handleSaveCurrentAsTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 disabled:opacity-40 transition-colors"
              >
                <Bookmark size={14} className="text-[var(--color-primary)]" />
                Sauvegarder en modèle
              </button>
              <div className="flex items-center gap-2">
                <AdminButton
                  type="button"
                  variant="secondary"
                  icon={Eye}
                  loading={previewing}
                  disabled={!canSend}
                  onClick={handlePreviewTarget}
                >
                  Tester la cible
                </AdminButton>
                <AdminButton
                  variant="primary"
                  icon={Send}
                  loading={sending}
                  disabled={!canSend}
                  onClick={() => handleSend()}
                >
                  Diffuser maintenant
                </AdminButton>
              </div>
            </div>
          }
        >
          <form onSubmit={handleSend} className="space-y-3">
            <fieldset>
              <legend className="mb-1.5 block text-xs font-semibold text-stone-700">
                Audience ou segment cible
              </legend>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AUDIENCES.map((a) => {
                  const selected = audience === a.value;
                  return (
                    <label
                      key={a.value}
                      className={cn(
                        'flex cursor-pointer flex-col rounded-lg border p-2.5 transition-all',
                        selected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-50)]/40 ring-1 ring-[var(--color-primary)]'
                          : 'border-stone-200 bg-white hover:bg-stone-50'
                      )}
                    >
                      <input
                        type="radio"
                        name="notif-audience"
                        value={a.value}
                        checked={selected}
                        onChange={() => setAudience(a.value)}
                        className="sr-only"
                      />
                      <span className="text-xs font-bold text-stone-900">{a.label}</span>
                      <span className="mt-0.5 text-[10px] text-stone-500">{a.sub}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="rounded-lg border border-stone-200 bg-stone-50/90 p-2.5 text-xs text-stone-800">
              <p className="font-semibold">
                Variables dynamiques (remplacées pour chaque destinataire dans Titre et Message) :
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {DYNAMIC_VARIABLES.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() => handleInsertVariable(v.token)}
                    className="rounded border border-stone-300 bg-white px-2 py-0.5 font-mono text-[11px] font-medium text-stone-800 hover:border-stone-400 hover:bg-stone-100"
                  >
                    + {v.label}
                  </button>
                ))}
              </div>
            </div>

            <AdminField
              label="Titre de la notification"
              rightLabel={`${title.length}/${TITLE_MAX}`}
              htmlFor="notif-title"
            >
              <input
                id="notif-title"
                name="title"
                value={title}
                maxLength={TITLE_MAX}
                onFocus={() => setFocusedField('title')}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Bonjour $nom, nouveautés disponibles"
                className={adminInputClass}
              />
            </AdminField>

            <AdminField
              label="Message"
              rightLabel={`${body.length}/${BODY_MAX}`}
              htmlFor="notif-body"
            >
              <textarea
                id="notif-body"
                name="body"
                rows={3}
                value={body}
                maxLength={BODY_MAX}
                onFocus={() => setFocusedField('body')}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Rédigez un message clair et direct..."
                className={adminInputClass}
              />
            </AdminField>

            <AdminField label="Lien d'ouverture au clic" htmlFor="notif-url">
              <input
                id="notif-url"
                name="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="/"
                className={adminInputClass}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK_LINKS.map((l) => (
                  <button
                    key={l.url}
                    type="button"
                    onClick={() => setUrl(l.url)}
                    className={cn(
                      'rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors',
                      url === l.url
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </AdminField>

            <NotificationPhonePreview
              audience={audience}
              title={title}
              body={body}
              previewResult={campaignPreview}
            />
          </form>
        </AdminSection>

        <AdminSection
          icon={Bell}
          title="Modèles rapides"
          description="Cliquez sur un modèle pour remplir l'éditeur."
        >
          <NotificationTemplateSelector
            allTemplates={allTemplates}
            selectedTemplateId={templateId}
            onSelectTemplate={handleApplyTemplate}
            onSaveCustomTemplate={saveTemplate}
            onDeleteCustomTemplate={deleteTemplate}
            currentFormState={{ title, body, url, audience }}
          />
        </AdminSection>
      </div>

      <NotificationBroadcastHistory
        history={history}
        onReuseNotification={({ title: t, body: b, url: u }) => {
          setTitle(t);
          setBody(b);
          setUrl(u);
          toast.success('Message rechargé dans l’éditeur');
        }}
      />
    </div>
  );
};
