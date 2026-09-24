import React, { useState } from 'react';
import { AdminUsersTab } from './AdminUsersTab';
import { AdminIpBanSection } from './AdminIpBanSection';
import { AdminPageHeader, AdminTabs } from './ui/AdminUI';

type UsersView = 'accounts' | 'ip';

/**
 * Utilisateurs : les comptes et, à côté, les adresses IP bloquées. Le
 * bannissement d'IP était rangé dans la configuration système, loin de la
 * modération des comptes à laquelle il se rattache.
 */
export const AdminUsersPage: React.FC = () => {
  const [view, setView] = useState<UsersView>('accounts');

  return (
    <div>
      <AdminPageHeader
        title="Utilisateurs"
        description="Comptes, rôles, modération et application d’origine (DaloaMarket, DaloaDelivery)."
      />
      <AdminTabs<UsersView>
        value={view}
        onChange={setView}
        tabs={[
          { key: 'accounts', label: 'Comptes' },
          { key: 'ip', label: 'Adresses IP bloquées' },
        ]}
      />
      {view === 'accounts' ? <AdminUsersTab /> : <AdminIpBanSection />}
    </div>
  );
};
