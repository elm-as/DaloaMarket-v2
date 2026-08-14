import React from 'react';
import { Link } from 'react-router-dom';

interface FooterLinkItem {
  label: string;
  path: string;
  external?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLinkItem[];
}

const FOOTER_LINKS: FooterSection[] = [
  {
    title: 'DaloaMarket',
    links: [
      { label: 'Accueil', path: '/' },
      { label: 'Rechercher', path: '/search' },
      { label: 'Comment ça marche', path: '/how-it-works' },
      { label: 'Devenir vendeur Pro', path: '/devenir-pro' },
    ],
  },
  {
    title: 'Compte',
    links: [
      { label: 'Mon profil', path: '/profile' },
      { label: 'Mes commandes', path: '/mes-commandes' },
      { label: 'Messages', path: '/messages' },
      { label: 'Paramètres', path: '/settings' },
    ],
  },
  {
    title: 'Informations',
    links: [
      { label: 'À propos', path: '/about' },
      { label: 'FAQ', path: '/faq' },
      { label: 'Aide & Support', path: '/help' },
      { label: 'Tarifs & Packs', path: '/pricing' },
    ],
  },
  {
    title: 'Écosystème Daloa',
    links: [
      { label: '🏍️ DaloaDelivery', path: 'https://delivery.daloamarket.com', external: true },
      { label: '💡 Centre Tutoriels', path: 'https://tuto.daloamarket.com', external: true },
      { label: '📖 Documentation & API', path: 'https://docs.daloamarket.com', external: true },
      { label: '🟢 Statut Système', path: 'https://status.daloamarket.ci', external: true },
    ],
  },
  {
    title: 'Légal',
    links: [
      { label: "Conditions d'utilisation", path: '/terms' },
      { label: 'Confidentialité', path: '/privacy' },
      { label: 'Mentions légales', path: '/mentions-legales' },
    ],
  },
];

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="hidden lg:block border-t border-gray-100 mt-12"
      style={{ background: 'var(--color-surface)' }}
    >
      <div
        className="mx-auto px-8 py-10"
        style={{ maxWidth: 'var(--container-max-width)' }}
      >
        <div className="grid grid-cols-5 gap-6">
          {FOOTER_LINKS.map((section) => (
            <div key={section.title}>
              <h3
                className="text-sm font-bold mb-4"
                style={{ color: 'var(--color-on-surface)' }}
              >
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.path}>
                    {link.external ? (
                      <a
                        href={link.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm transition-colors hover:text-[var(--color-primary)] no-underline"
                        style={{ color: 'var(--color-on-surface-variant)' }}
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.path}
                        className="text-sm transition-colors hover:text-[var(--color-primary)] no-underline"
                        style={{ color: 'var(--color-on-surface-variant)' }}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="DaloaMarket"
              className="w-6 h-6 object-contain"
            />
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--color-on-surface)' }}
            >
              DaloaMarket
            </span>
          </div>
          <p
            className="text-xs"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            © {currentYear} ElmasCore — Fondé par Elmas — Tous droits réservés
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
