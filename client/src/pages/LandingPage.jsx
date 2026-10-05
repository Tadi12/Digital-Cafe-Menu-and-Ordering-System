import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SpacetimeGrid from '../components/common/SpacetimeGrid';

// A warm restaurant interior, served from Unsplash's CDN at build-stable params.
// Kept as an <img> (not a CSS background) so it can be preloaded and so the
// hero is the page's LCP element rather than an invisible layer.
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2000&q=80';

const LandingPage = () => {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-cafe-900">
      {/* Background photograph */}
      <img
        src={HERO_IMAGE}
        alt={t('landing_hero_image_alt')}
        className="absolute inset-0 h-full w-full object-cover object-center"
        loading="eager"
        fetchPriority="high"
      />

      {/* Legibility overlays: vertical for the navbar and headline, horizontal
          to keep the edges dark behind the logo and the login button. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-cafe-900/85 via-cafe-900/55 to-cafe-900/95"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-cafe-900/75 via-transparent to-cafe-900/55"
      />

      {/* The spacetime grid. Sits above the photograph and the legibility overlays
          so the field is actually visible, and below the content (z-10) so the
          navbar and headline stay crisp on top of it.

          It is pointer-events-none and reads the pointer from the window, so the
          hero's logo and login links keep working normally. */}
      <div className="absolute inset-0 z-0">
        <SpacetimeGrid />
      </div>

      {/* Navbar */}
      <header className="relative z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-6">
          {/* Left: logo + name */}
          <Link
            to="/"
            className="flex items-center gap-3 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <img
              src="/logo.png"
              alt=""
              aria-hidden="true"
              className="h-11 w-11 shrink-0 rounded-full object-cover shadow-lg ring-1 ring-white/25 sm:h-12 sm:w-12"
            />
            <span className="font-display text-lg font-bold tracking-tight text-white drop-shadow sm:text-xl">
              {t('app_name')}
            </span>
          </Link>

          {/* Right: login */}
          <Link
            to="/admin/login"
            className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-white px-6 py-2.5 text-sm font-bold text-cafe-900 shadow-lg transition hover:bg-gold-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:px-7 sm:text-base"
          >
            {t('login')}
          </Link>
        </div>
      </header>

      {/* Centre */}
      <main className="relative z-10 flex items-center justify-center px-5 pb-20 pt-10 sm:pb-24">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-500 drop-shadow sm:text-sm">
            {t('landing_hero_eyebrow')}
          </p>

          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white drop-shadow-2xl sm:text-6xl lg:text-7xl">
            {t('landing_hero_title')}
          </h1>

          <div
            aria-hidden="true"
            className="mx-auto mt-7 h-px w-20 bg-gold-500 sm:w-28"
          />

          <p className="mx-auto mt-7 max-w-xl text-sm leading-relaxed text-cafe-100/90 drop-shadow sm:text-base">
            {t('landing_hero_subtitle')}
          </p>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;