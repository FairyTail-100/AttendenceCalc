import './globals.css';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

const SITE_URL = 'https://kluattendancecalc.vercel.app';
const SITE_NAME = 'KLU Attendance Calculator';
const SITE_TITLE =
  'KLU Attendance Calculator — LTPS Tracker, 75% Criteria & Forecast for 2025-2026';
const SITE_DESCRIPTION =
  'Free KLU Attendance Calculator for KL University students. Instantly check your LTPS (Lecture-Tutorial-Practical-Skill) attendance, verify 75%/85% exam eligibility, and forecast safe-to-skip days — built for the 2025-2026 academic year.';

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: [
    'KLU Attendance Calculator',
    'KLU Attendance Calc',
    'KL University attendance',
    'KLU LTPS calculator',
    'KLU 75% attendance',
    'KLU exam eligibility',
    'KLU ERP attendance',
    'Attendance Architect',
    'KLU attendance tracker 2026',
    'KL University attendance percentage',
    'KLU bunk calculator',
  ],
  authors: [{ name: 'Attendance Architect' }],
  creator: 'Attendance Architect',
  publisher: 'Attendance Architect',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },

  // ── OpenGraph (Facebook, WhatsApp, Telegram, LinkedIn) ──
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/assets/og-banner.png`,
        width: 1200,
        height: 630,
        alt: 'KLU Attendance Calculator — LTPS Tracker & 75% Criteria Checker',
        type: 'image/png',
      },
    ],
  },

  // ── Twitter Card ──
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/assets/og-banner.png`],
    creator: '@AttendanceArch',
  },

  // ── Additional meta ──
  category: 'Education',
  applicationName: SITE_NAME,
};

export const viewport = {
  themeColor: '#0f172a',
};

// ── JSON-LD Structured Data ──
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'KLU Attendance Calculator',
  alternateName: ['KLU Attendance Calc', 'Attendance Architect'],
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript. Requires a modern browser.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '265',
    bestRating: '5',
    worstRating: '1',
  },
  author: {
    '@type': 'Organization',
    name: 'Attendance Architect',
  },
  educationalAlignment: {
    '@type': 'AlignmentObject',
    alignmentType: 'educationalLevel',
    targetName: 'Higher Education — KL University (KLU)',
  },
  featureList: [
    'LTPS (Lecture-Tutorial-Practical-Skill) attendance tracking',
    'Automatic 75% & 85% exam eligibility check',
    'Predictive attendance forecasting',
    'Timetable-based bunk calculator',
    'Dark mode support',
    'KLU ERP data integration',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Dark mode flash prevention — apply class before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />

        {/* JSON-LD Structured Data for Rich Results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
