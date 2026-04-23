// app/page.tsx
"use client";

import Link from "next/link";
import { 
  Check, Zap, Shield, TrendingUp, Sparkles, Star, ShoppingCart, 
  Package, Users, Globe, Clock, Coffee, Store, Scissors, Warehouse, 
  ArrowRight, ChevronRight, Sun, Moon, Menu, X, Play, Image as ImageIcon,
  X as XIcon, PoundSterling, Receipt, Smartphone, Headphones
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import { motion, AnimatePresence, useInView } from "framer-motion";

const REAL_IMAGES = {
  warehouse: {
    bacon: "https://www.extensiv.com/hubfs/AdobeStock_181658575.jpeg",
    cola: "https://lh4.googleusercontent.com/proxy/6nCi8IbZxn_9HGj2CqUqLixyWwsTfrBCvZi-4vP8WrUocMmpKTEZXOmp1cd0g1a70ixYg6TI313BP8mSdz5XoSljs65OdnEauh8_PVY",
    waterPallet: "https://images.squarespace-cdn.com/content/v1/5748ef421d07c0e0855afd96/1699379086538-1FHDG6T23YKNMU54KJQU/FirstAllianceLogisticsManagementLLC-252298-Warehouse-Pallet-Storage-image1.jpg",
    snacks: "https://lh4.googleusercontent.com/proxy/fp77H8fmwGpgjy93zxVpTwS96yhMdz4xwtKIzdr03N8x6pK9A-9kujTZ5JtE5PCk7do0eN8ptXSXQ0lLSym8LEQo2ZKr9lYKk_EqV20"
  },
  restaurant: {
    avocadoToast: "https://www.trustpayments.com/wp-content/uploads/2024/02/Choosing-the-right-POS-for-your-coffee-shop-jpg.webp",
  },
  retail: {
    coldDrinks: "https://img.yfisher.com/m43007/1772699180650-cash-register-black-screen/jpg100-t3-scale100.webp",
  },
  salon: {
    quiffHair: "https://png.pngtree.com/thumb_back/fh260/background/20250112/pngtree-modern-barbershop-interior-with-empty-black-chairs-wooden-walls-and-mirrors-image_16867937.jpg",
  }
};

// Animated counter hook
function useCounter(end: number, duration: number = 2000, start: boolean = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start]);
  return count;
}

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [turnover, setTurnover] = useState(10000);
  const savingsRef = useRef(null);
  const savingsInView = useInView(savingsRef, { once: true });

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    }
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });
    const handleScroll = () => setScrolled(window.scrollY > 50);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    handleScroll();
    checkMobile();
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', checkMobile);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  // Savings calculator
  const squareFees = Math.round(turnover * 0.0175);
  const demlyFee = 29;
  const annualSaving = (squareFees - demlyFee) * 12;

  const bgGradient = theme === 'dark' 
    ? 'bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950' 
    : 'bg-gradient-to-br from-slate-50 via-white to-slate-100';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const textSecondary = theme === 'dark' ? 'text-slate-300' : 'text-slate-600';
  const textMuted = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const cardBg = theme === 'dark' 
    ? 'bg-slate-900/40 backdrop-blur-xl border-slate-800/50' 
    : 'bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg';
  const headerBg = theme === 'dark' 
    ? 'bg-black/80 backdrop-blur-xl' 
    : 'bg-white/80 backdrop-blur-xl border-b border-slate-200';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${bgGradient}`}>

      {/* ── NAV ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-2 shadow-xl' : 'py-3'} ${headerBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="group flex-shrink-0"><Logo size="large" /></Link>
            <div className="md:hidden flex items-center gap-2">
              <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                {theme === 'dark' ? <Sun className="w-5 h-5 text-slate-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
              </button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={`p-2 rounded-full ${theme === 'dark' ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-700 hover:text-black hover:bg-black/5'} transition-colors`}>
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
            <div className="hidden md:flex items-center gap-1 lg:gap-2">
              {['Features', 'Pricing', 'Industries', 'Hardware'].map((item, i) => {
                const href = item === 'Industries' ? '/industries' : item === 'Hardware' ? '/hardware' : `#${item.toLowerCase()}`;
                return (
                  <a key={i} href={href} className={`px-4 py-2 rounded-full text-sm lg:text-base font-medium transition-all ${theme === 'dark' ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-black hover:bg-black/5'}`}>{item}</a>
                );
              })}
            </div>
            <div className="hidden md:flex items-center gap-3">
              <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                {theme === 'dark' ? <Sun className="w-5 h-5 text-slate-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
              </button>
              {isLoggedIn ? (
                <Link href="/dashboard" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-full font-bold text-white transition-colors text-sm lg:text-base shadow-lg shadow-emerald-600/20">Dashboard</Link>
              ) : (
                <>
                  <Link href="/login" className={`px-5 py-2.5 rounded-full font-semibold text-sm lg:text-base transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-black hover:bg-black/5'}`}>Sign In</Link>
                  <Link href="/pay" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-full font-bold text-white transition-colors text-sm lg:text-base shadow-lg shadow-emerald-600/20">Start Free Trial</Link>
                </>
              )}
            </div>
          </div>
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden mt-4 border-t border-slate-200 dark:border-white/10 pt-4">
                <div className="flex flex-col space-y-2">
                  {['Features', 'Pricing', 'Industries'].map((item, i) => (
                    <a key={i} href={item === 'Industries' ? '/industries' : `#${item.toLowerCase()}`} className={`px-4 py-3 rounded-xl text-base font-medium transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-black hover:bg-black/5'}`} onClick={() => setMobileMenuOpen(false)}>{item}</a>
                  ))}
                  <div className="border-t border-slate-200 dark:border-white/10 pt-4 mt-2 flex gap-3">
                    {isLoggedIn ? (
                      <Link href="/dashboard" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-center py-3 rounded-xl font-bold" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                    ) : (
                      <>
                        <Link href="/login" className="flex-1 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-center py-3 rounded-xl font-semibold" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
                        <Link href="/pay" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-center py-3 rounded-xl font-bold" onClick={() => setMobileMenuOpen(false)}>Free Trial</Link>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className={`pt-24 md:pt-32 pb-16 md:pb-20 px-4 sm:px-6 ${theme === 'dark' ? 'bg-black' : 'bg-gradient-to-br from-emerald-50 to-white'}`}>
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6 md:mb-8">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className={`text-xs md:text-sm font-semibold ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`}>
              Built for UK Small Businesses
            </span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 md:mb-6 leading-tight ${textPrimary}`}>
            The POS System UK Small<br />Businesses Actually Afford
            <br />
            <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
              £29/Month. Zero Transaction Fees.
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`text-base sm:text-lg md:text-xl ${textSecondary} mb-8 md:mb-12 max-w-2xl md:max-w-3xl mx-auto px-4`}>
            Full POS system for shops, salons, cafes, and any retail business. 
            No contracts, no transaction fees, works on any device.
            Square takes 1.75% of every sale — we don't.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            {isLoggedIn ? (
              <Link href="/dashboard" className="px-8 sm:px-10 py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 rounded-full font-bold text-base sm:text-lg text-white transition-colors shadow-lg shadow-emerald-600/20">Open Dashboard</Link>
            ) : (
              <>
                <Link href="/pay" className="px-8 sm:px-10 py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 rounded-full font-bold text-base sm:text-lg text-white transition-colors shadow-lg shadow-emerald-600/20">
                  Start Free Trial — No Card Required
                </Link>
                <Link href="/industries" className={`px-8 sm:px-10 py-3 sm:py-4 rounded-full font-bold text-base sm:text-lg transition-colors ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white' : 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-slate-900'}`}>
                  Browse Industries
                </Link>
              </>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-wrap items-center justify-center gap-4 mt-10 md:mt-14">
            {['No transaction fees', 'No contracts', 'Cancel anytime', 'UK based'].map((badge, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Check className={`w-4 h-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>{badge}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── SAVINGS CALCULATOR ── */}
      <section ref={savingsRef} className={`py-16 md:py-20 px-4 sm:px-6 ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'}`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className={`text-2xl sm:text-3xl md:text-4xl font-black mb-3 ${textPrimary}`}>
              How Much Is Square <span className="bg-gradient-to-r from-red-500 to-rose-600 bg-clip-text text-transparent">Really Costing You?</span>
            </h2>
            <p className={`${textSecondary} text-base md:text-lg`}>Move the slider to see your monthly card turnover</p>
          </div>

          <div className={`${cardBg} rounded-3xl p-6 md:p-10 border`}>
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className={`font-semibold ${textSecondary}`}>Monthly card turnover</span>
                <span className={`text-2xl font-black text-emerald-600`}>£{turnover.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="1000"
                max="50000"
                step="500"
                value={turnover}
                onChange={e => setTurnover(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-600"
              />
              <div className={`flex justify-between text-xs mt-1 ${textMuted}`}>
                <span>£1,000</span>
                <span>£50,000</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 md:gap-6 mb-8">
              {/* Square */}
              <div className={`rounded-2xl p-4 md:p-6 border ${theme === 'dark' ? 'bg-red-950/30 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-xs md:text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Square</p>
                <p className={`text-xl md:text-3xl font-black ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>£{squareFees}</p>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-red-400/70' : 'text-red-500'}`}>per month</p>
                <p className={`text-xs mt-2 ${textMuted}`}>1.75% per transaction</p>
              </div>

              {/* Demly */}
              <div className={`rounded-2xl p-4 md:p-6 border-2 border-emerald-500/50 ${theme === 'dark' ? 'bg-emerald-950/30' : 'bg-emerald-50'}`}>
                <p className={`text-xs md:text-sm font-semibold mb-1 text-emerald-600`}>Demly</p>
                <p className="text-xl md:text-3xl font-black text-emerald-600">£29</p>
                <p className={`text-xs mt-1 text-emerald-600/70`}>per month</p>
                <p className={`text-xs mt-2 ${textMuted}`}>Zero transaction fees</p>
              </div>

              {/* You save */}
              <div className={`rounded-2xl p-4 md:p-6 border ${theme === 'dark' ? 'bg-emerald-950/30 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className={`text-xs md:text-sm font-semibold mb-1 text-emerald-600`}>You save</p>
                <p className="text-xl md:text-3xl font-black text-emerald-600">£{Math.max(0, squareFees - demlyFee)}</p>
                <p className={`text-xs mt-1 text-emerald-600/70`}>per month</p>
                <p className={`text-xs mt-2 font-bold text-emerald-600`}>£{Math.max(0, annualSaving).toLocaleString()}/year</p>
              </div>
            </div>

            {annualSaving > 0 && (
              <motion.div key={annualSaving} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`text-center p-4 rounded-2xl ${theme === 'dark' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-100 border border-emerald-300'}`}>
                <p className={`text-sm md:text-base font-semibold text-emerald-600`}>
                  At £{turnover.toLocaleString()}/month turnover, switching to Demly saves you{' '}
                  <span className="text-lg md:text-xl font-black">£{annualSaving.toLocaleString()}</span> every year
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className={`py-16 md:py-20 px-4 sm:px-6 ${theme === 'dark' ? 'bg-black/50' : 'bg-slate-50'}`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className={`text-2xl sm:text-3xl md:text-4xl font-black mb-3 ${textPrimary}`}>
              How We Compare
            </h2>
            <p className={`${textSecondary} text-base md:text-lg`}>Honest comparison. No spin.</p>
          </div>

          <div className={`${cardBg} rounded-3xl overflow-hidden border`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                    <th className={`p-4 md:p-6 text-left text-sm font-semibold ${textMuted}`}></th>
                    <th className="p-4 md:p-6 text-center">
                      <div className={`text-sm font-bold ${textPrimary}`}>Demly</div>
                      <div className="text-emerald-600 font-black text-lg">£29/mo</div>
                    </th>
                    <th className="p-4 md:p-6 text-center">
                      <div className={`text-sm font-bold ${textPrimary}`}>Square</div>
                      <div className={`font-black text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Free + 1.75%</div>
                    </th>
                    <th className="p-4 md:p-6 text-center">
                      <div className={`text-sm font-bold ${textPrimary}`}>Lightspeed</div>
                      <div className={`font-black text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>£69/mo</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Monthly fee', demly: '£29', square: '£0*', lightspeed: '£69' },
                    { feature: 'Transaction fees', demly: 'None ✓', square: '1.75% per sale', lightspeed: 'None' },
                    { feature: 'Cost at £10k/mo turnover', demly: '£29', square: '£175 + fees', lightspeed: '£69', highlight: true },
                    { feature: 'Cost at £20k/mo turnover', demly: '£29', square: '£350 + fees', lightspeed: '£69', highlight: true },
                    { feature: 'Inventory management', demly: '✓', square: '✓', lightspeed: '✓' },
                    { feature: 'Staff PIN logins', demly: '✓', square: '✓', lightspeed: '✓' },
                    { feature: 'Customer balances', demly: '✓', square: '✗', lightspeed: '✗' },
                    { feature: 'Works on any device', demly: '✓', square: 'iPad/Android', lightspeed: 'iPad only' },
                    { feature: 'UK based support', demly: '✓', square: '✗', lightspeed: '✗' },
                    { feature: 'Contract required', demly: 'None', square: 'None', lightspeed: 'Annual' },
                  ].map((row, i) => (
                    <tr key={i} className={`border-b last:border-0 ${theme === 'dark' ? 'border-slate-700/30' : 'border-slate-100'} ${row.highlight ? (theme === 'dark' ? 'bg-emerald-950/20' : 'bg-emerald-50/50') : ''}`}>
                      <td className={`p-4 md:p-6 text-sm font-medium ${textSecondary} ${row.highlight ? 'font-bold' : ''}`}>{row.feature}</td>
                      <td className="p-4 md:p-6 text-center">
                        <span className={`text-sm font-bold text-emerald-600`}>{row.demly}</span>
                      </td>
                      <td className={`p-4 md:p-6 text-center text-sm ${row.highlight ? 'font-bold text-red-500' : textMuted}`}>{row.square}</td>
                      <td className={`p-4 md:p-6 text-center text-sm ${textMuted}`}>{row.lightspeed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`px-6 py-3 text-xs ${textMuted} border-t ${theme === 'dark' ? 'border-slate-700/30' : 'border-slate-100'}`}>
              *Square's "free" plan charges 1.75% per in-person transaction. At £10,000/month that's £175 — vs our flat £29.
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE DEMLY ── */}
      <section className="py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-4 ${textPrimary}`}>
              Why UK Businesses <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">Choose Demly</span>
            </h2>
            <p className={`text-base sm:text-lg ${textSecondary} max-w-2xl mx-auto`}>
              We built this because UK small businesses were being overcharged for basic tools
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {[
              {
                icon: PoundSterling,
                color: 'from-emerald-500 to-green-600',
                title: 'Flat £29/month. That\'s it.',
                desc: 'No transaction fees eating into your margins. No per-device charges. No hidden costs. One price, everything included. Square charges 1.75% per transaction — on £20k monthly turnover that\'s £350 before you\'ve even paid for the software.'
              },
              {
                icon: Smartphone,
                color: 'from-blue-500 to-cyan-600',
                title: 'Works on any device you already own',
                desc: 'iPad, Android tablet, Windows laptop, Mac — it runs in any browser. No expensive proprietary hardware required. Start selling today on whatever you already have.'
              },
              {
                icon: Zap,
                color: 'from-amber-500 to-orange-600',
                title: 'Set up in under 10 minutes',
                desc: 'Sign up, add your products, and you\'re taking payments. No installation, no engineer visit, no week-long onboarding. We\'ve seen businesses go live in the same day they signed up.'
              },
              {
                icon: Users,
                color: 'from-purple-500 to-pink-600',
                title: 'Built for real teams',
                desc: 'Staff PIN logins, role-based permissions, manager controls. Each staff member logs in with their own PIN — owners control exactly what they can see and do. Works for solo operators and teams alike.'
              },
              {
                icon: Package,
                color: 'from-rose-500 to-red-600',
                title: 'Inventory that actually works',
                desc: 'Track stock levels, get low-stock alerts, scan barcodes. Supports thermal receipt printers, cash drawers, and barcode scanners. Real hardware integration, not just a glorified spreadsheet.'
              },
              {
                icon: Shield,
                color: 'from-slate-500 to-slate-700',
                title: 'Your data, your business',
                desc: 'GDPR compliant, UK-registered company. Your customer data never leaves UK servers. No selling your data to third parties. You own everything — cancel and export everything at any time.'
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`${cardBg} rounded-3xl p-6 md:p-8 border hover:border-emerald-500/30 transition-all group`}
              >
                <div className={`w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r ${item.color} rounded-2xl flex items-center justify-center mb-4 md:mb-5 group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <h3 className={`text-lg md:text-xl font-bold mb-2 md:mb-3 ${textPrimary}`}>{item.title}</h3>
                <p className={`${textSecondary} text-sm md:text-base leading-relaxed`}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO ── */}
      <section id="demo" className={`py-16 md:py-20 px-4 sm:px-6 ${theme === 'dark' ? 'bg-black/50' : 'bg-emerald-50/50'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-4 md:mb-6 ${textPrimary}`}>
              See <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">Demly POS</span> in Action
            </h2>
            <p className={`text-base sm:text-lg md:text-xl ${textSecondary} max-w-2xl md:max-w-3xl mx-auto`}>
              Watch a real walkthrough of the full system
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className={`${cardBg} rounded-3xl overflow-hidden border hover:border-emerald-500/30 transition-all`}>
              <div className="aspect-video bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 relative group overflow-hidden">
                <img src="https://image2url.com/r2/default/images/1771495015474-7e6f2e72-fbc3-4fb7-a72d-4b195a443c77.png" alt="POS Interface Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6">
                <h3 className={`text-xl font-bold mb-2 ${textPrimary}`}>Point of Sale Interface</h3>
                <p className={`${textSecondary} text-sm`}>Clean, intuitive design that speeds up transactions</p>
              </div>
            </div>
            <div className={`${cardBg} rounded-3xl overflow-hidden border hover:border-emerald-500/30 transition-all`}>
              <div className="aspect-video bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 relative group overflow-hidden">
                <img src="https://image2url.com/r2/default/images/1771495566483-ef898d6e-2837-4fa7-a67b-e5ddcd23b44c.png" alt="Reports and Analytics Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6">
                <h3 className={`text-xl font-bold mb-2 ${textPrimary}`}>Real-Time Analytics</h3>
                <p className={`${textSecondary} text-sm`}>Track sales, inventory, and staff performance</p>
              </div>
            </div>
          </div>
          <div className={`${cardBg} rounded-3xl overflow-hidden border hover:border-emerald-500/30 transition-all`}>
            <div className="aspect-video relative">
              <iframe width="100%" height="100%" src="https://www.youtube.com/embed/qzTsZLifM7Q" title="Demly POS Demo" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute inset-0 w-full h-full"></iframe>
            </div>
            <div className="p-6 text-center">
              <h3 className={`text-xl font-bold mb-2 ${textPrimary}`}>Complete Walkthrough</h3>
              <p className={`${textSecondary} text-sm max-w-2xl mx-auto`}>See how Demly POS can streamline your entire business operation</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── INDUSTRIES ── */}
      <section className="py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-4 md:mb-6 ${textPrimary}`}>
              Built for <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">Every Business</span>
            </h2>
            <p className={`text-base sm:text-lg md:text-xl ${textSecondary} max-w-2xl md:max-w-3xl mx-auto`}>Industry-specific features for maximum efficiency</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { title: "Restaurants & Cafés", icon: Coffee, gradient: "from-orange-500 to-amber-600", image: REAL_IMAGES.restaurant.avocadoToast, features: ["Table Management", "Digital Menus", "Kitchen Display"] },
              { title: "Retail Stores", icon: Store, gradient: "from-blue-500 to-cyan-600", image: REAL_IMAGES.retail.coldDrinks, features: ["Barcode Scanning", "Multi-Store", "Inventory"] },
              { title: "Salons & Barbers", icon: Scissors, gradient: "from-purple-500 to-pink-600", image: REAL_IMAGES.salon.quiffHair, features: ["Appointments", "Staff Scheduling", "Services"] },
              { title: "Warehouses", icon: Warehouse, gradient: "from-emerald-500 to-green-600", image: REAL_IMAGES.warehouse.cola, features: ["Bulk Sales", "Pallet Tracking", "Supplier"] },
            ].map((industry, i) => (
              <div key={i} className={`group ${cardBg} rounded-3xl overflow-hidden hover:border-emerald-500/30 transition-all border`}>
                <div className="h-40 sm:h-48 overflow-hidden">
                  <div className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500" style={{ backgroundImage: `url(${industry.image})` }} />
                </div>
                <div className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r ${industry.gradient} flex items-center justify-center`}>
                      <industry.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <h3 className={`text-lg sm:text-xl font-bold ${textPrimary}`}>{industry.title}</h3>
                  </div>
                  <div className="space-y-2">
                    {industry.features.map((feature, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs sm:text-sm">
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
                        <span className={`truncate ${textSecondary}`}>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/industries" className="mt-4 inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs sm:text-sm font-semibold group">
                    See more <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className={`py-16 md:py-20 px-4 sm:px-6 ${theme === 'dark' ? 'bg-black/50' : 'bg-slate-50'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-4 md:mb-6 ${textPrimary}`}>Everything You Need to Run Your Business</h2>
            <p className={`text-base sm:text-lg md:text-xl ${textSecondary} max-w-2xl md:max-w-3xl mx-auto`}>All the tools, one flat price</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: Shield, title: "Bank-Level Security", desc: "End-to-end encryption and PCI compliance" },
              { icon: Zap, title: "Lightning Fast", desc: "Process transactions in under 2 seconds" },
              { icon: TrendingUp, title: "Real-Time Analytics", desc: "Live dashboards and business insights" },
              { icon: Users, title: "Multi-Staff Access", desc: "Role-based permissions for every team member" },
              { icon: Globe, title: "Cloud-Based", desc: "Access from anywhere, automatic backups" },
              { icon: Package, title: "Full Inventory", desc: "Barcode scanning, stock alerts, supplier tracking" },
            ].map((feature, i) => (
              <div key={i} className={`${cardBg} rounded-3xl p-4 sm:p-6 hover:border-emerald-500/30 transition-all border group`}>
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
                </div>
                <h3 className={`text-lg sm:text-xl font-bold mb-2 ${textPrimary}`}>{feature.title}</h3>
                <p className={`${textSecondary} text-sm sm:text-base`}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-4 md:mb-6 ${textPrimary}`}>
              Simple, <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">Transparent Pricing</span>
            </h2>
            <p className={`text-base sm:text-lg md:text-xl ${textSecondary} max-w-2xl md:max-w-3xl mx-auto`}>No hidden fees. No transaction charges. Cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className={`${cardBg} rounded-3xl p-6 md:p-8 border hover:border-emerald-500/30 transition-all`}>
              <div className="mb-6">
                <h3 className={`text-xl font-bold mb-2 ${textPrimary}`}>Monthly</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-emerald-600">£29</span>
                  <span className={`${textMuted}`}>/month</span>
                </div>
                <p className={`text-sm mt-2 ${textMuted}`}>No card needed for trial</p>
              </div>
              <ul className="space-y-3 mb-6">
                {["Complete POS System", "Unlimited transactions", "Staff accounts (up to 10)", "Full inventory management", "Email support"].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className={`text-sm ${textSecondary}`}>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/pay?plan=monthly" className={`block w-full text-center py-3 rounded-full font-bold transition-colors ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border border-white/10' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'} ${textPrimary}`}>
                Start Free Trial
              </Link>
            </div>
            <div className={`${cardBg} rounded-3xl p-6 md:p-8 border-2 border-emerald-500/30 relative`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full">BEST VALUE</div>
              <div className="mb-6">
                <h3 className={`text-xl font-bold mb-2 ${textPrimary}`}>Annual</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-emerald-600">£299</span>
                  <span className={`${textMuted}`}>/year</span>
                </div>
                <p className={`text-sm mt-2 text-emerald-600 font-semibold`}>Save £49 vs monthly</p>
              </div>
              <ul className="space-y-3 mb-6">
                {["Everything in Monthly", "Save £49 per year", "Priority support", "Early access to new features"].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className={`text-sm ${textSecondary}`}>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/pay?plan=annual" className="block w-full text-center py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold transition-colors shadow-lg shadow-emerald-600/20">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={`py-16 md:py-20 px-4 sm:px-6 ${theme === 'dark' ? 'bg-black' : 'bg-emerald-50'}`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`text-2xl sm:text-3xl md:text-4xl font-black mb-4 ${textPrimary}`}>
            Stop paying transaction fees. Start today.
          </h2>
          <p className={`text-lg md:text-xl ${textSecondary} mb-3`}>
            Free trial. No credit card. Set up in 10 minutes.
          </p>
          <p className={`text-sm ${textMuted} mb-8`}>
            14-day money back guarantee if you're not happy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isLoggedIn ? (
              <Link href="/dashboard" className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold transition-colors shadow-lg shadow-emerald-600/20">Go to Dashboard</Link>
            ) : (
              <>
                <Link href="/pay" className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold transition-colors shadow-lg shadow-emerald-600/20">
                  Start Free Trial — No Card Required
                </Link>
                <Link href="/industries" className={`px-8 py-4 rounded-full font-bold transition-colors ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'}`}>
                  View Industries
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={`py-16 px-4 sm:px-6 border-t ${theme === 'dark' ? 'bg-black border-white/5' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <div className="mb-6"><Logo size="large" /></div>
              <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-sm`}>© 2026 DEMLY. All rights reserved.</p>
            </div>
            <div className={`flex flex-wrap gap-4 sm:gap-6 md:gap-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-sm justify-center`}>
              <a href="/privacy" className="hover:text-emerald-600 transition-colors px-3 py-1 rounded-full hover:bg-emerald-50/10">Privacy</a>
              <a href="/terms" className="hover:text-emerald-600 transition-colors px-3 py-1 rounded-full hover:bg-emerald-50/10">Terms</a>
              <a href="mailto:support@demly.co.uk" className="hover:text-emerald-600 transition-colors px-3 py-1 rounded-full hover:bg-emerald-50/10">Contact</a>
              <a href="/industries" className="hover:text-emerald-600 transition-colors px-3 py-1 rounded-full hover:bg-emerald-50/10">Industries</a>
              <a href="/hardware" className="hover:text-emerald-600 transition-colors px-3 py-1 rounded-full hover:bg-emerald-50/10">Hardware</a>
            </div>
          </div>
          <div className={`mt-8 pt-8 border-t ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} text-center`}>
            <p className={`${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'} text-sm`}>
              DEMLY LTD is a registered company operating in England and Wales under company number 16889796
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
