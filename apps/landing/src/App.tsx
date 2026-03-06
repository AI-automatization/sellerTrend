import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DownloadBanner } from './components/DownloadBanner';
import { CookieBanner } from './components/CookieBanner';
import { HeroSection } from './sections/HeroSection';
import { PainPointsSection } from './sections/PainPointsSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { DashboardPreview } from './sections/DashboardPreview';
import { StatsSection } from './sections/StatsSection';
import { VideoDemoSection } from './sections/VideoDemoSection';
import { PricingSection } from './sections/PricingSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { FAQSection } from './sections/FAQSection';
import { CTASection } from './sections/CTASection';
import { EmailCaptureSection } from './sections/EmailCaptureSection';
import { FooterSection } from './sections/FooterSection';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';

const APP_URL = import.meta.env.VITE_APP_URL || 'https://app.ventra.uz';

export default function App() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (pathname === '/privacy') return <PrivacyPage />;
  if (pathname === '/terms') return <TermsPage />;

  return (
    <div className="min-h-screen bg-base-100 text-base-content overflow-x-hidden">
      <Navbar appUrl={APP_URL} />
      <main>
        <HeroSection appUrl={APP_URL} />
        <PainPointsSection />
        <FeaturesSection />
        <DashboardPreview appUrl={APP_URL} />
        <StatsSection />
        <VideoDemoSection appUrl={APP_URL} />
        <PricingSection appUrl={APP_URL} />
        <TestimonialsSection />
        <FAQSection />
        <CTASection appUrl={APP_URL} />
        <EmailCaptureSection />
      </main>
      <FooterSection />
      <DownloadBanner />
      <CookieBanner />
    </div>
  );
}
