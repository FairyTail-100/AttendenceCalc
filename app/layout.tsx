import './globals.css';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Attendance Architect | KL University Attendance Calculator',
  description:
    'The most accurate KL University Attendance Calculator. Check exam eligibility (75%/85% rule), LTPS calculation, and predictive attendance forecasting.',
  keywords:
    'KL University,attendance calculator,exam eligibility,LTPS calculator,KLU ERP,Attendance Architect',
  authors: [{ name: 'Attendance Architect' }],
};

export const viewport = {
  themeColor: '#0f172a',
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
      </head>
      <body className={inter.className}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
