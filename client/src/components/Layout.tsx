import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { PriceTicker } from './PriceTicker';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-0)] bg-grid">
      {/* Ambient lights */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[300px] right-[10%] w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,212,255,.05) 0%, transparent 70%)', animation: 'glow-breathe 8s ease-in-out infinite' }} />
        <div className="absolute top-[40%] -left-[200px] w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(155,125,250,.04) 0%, transparent 70%)', animation: 'glow-breathe 10s ease-in-out infinite 3s' }} />
        <div className="absolute bottom-0 right-[20%] w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(16,217,138,.03) 0%, transparent 70%)' }} />
      </div>

      {/* Ticker + nav */}
      <div className="relative z-40">
        <PriceTicker />
        <Navbar />
      </div>

      {/* Page content */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
