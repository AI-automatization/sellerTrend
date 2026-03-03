import { Navbar } from './components/Navbar';
import { DownloadBanner } from './components/DownloadBanner';
import { HeroSection } from './sections/HeroSection';
import { PainPointsSection } from './sections/PainPointsSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { DashboardPreview } from './sections/DashboardPreview';
import { StatsSection } from './sections/StatsSection';
import { PricingSection } from './sections/PricingSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { FAQSection } from './sections/FAQSection';
import { CTASection } from './sections/CTASection';
import { EmailCaptureSection } from './sections/EmailCaptureSection';
import { FooterSection } from './sections/FooterSection';

const APP_URL = import.meta.env.VITE_APP_URL || 'https://app.ventra.uz';

export default function App() {
  return (
    <div className="min-h-screen bg-base-100 text-base-content overflow-x-hidden">
      <Navbar appUrl={APP_URL} />
      <main>
        <HeroSection appUrl={APP_URL} />
        <PainPointsSection />
        <FeaturesSection />
        <DashboardPreview appUrl={APP_URL} />
        <StatsSection />
        <PricingSection appUrl={APP_URL} />
        <TestimonialsSection />
        <FAQSection />
        <CTASection appUrl={APP_URL} />
        <EmailCaptureSection />
      </main>
      <FooterSection />
      <DownloadBanner />
    </div>
  );
}
