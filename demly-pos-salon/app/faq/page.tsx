"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  HelpCircle, Mail, ChevronDown, ChevronUp, Sparkles, 
  Sun, Moon, Menu, X, CreditCard, Clock, Shield, 
  Users, Settings, Printer, RefreshCw, Zap, Globe
} from "lucide-react";
import Logo from "@/components/Logo";
import { motion, AnimatePresence } from "framer-motion";

export default function FAQPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openItems, setOpenItems] = useState<string[]>([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    }

    const handleScroll = () => setScrolled(window.scrollY > 50);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    
    handleScroll();
    checkMobile();
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', checkMobile);
    
    return () => {
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

  const toggleItem = (id: string) => {
    setOpenItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // Theme-based classes
  const bgColor = theme === 'dark' ? 'bg-black' : 'bg-gradient-to-br from-slate-50 via-white to-slate-100';
  
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const textSecondary = theme === 'dark' ? 'text-slate-300' : 'text-slate-600';
  const textMuted = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
  
  const cardBg = theme === 'dark' 
    ? 'bg-slate-900/40 backdrop-blur-xl border-slate-800/50' 
    : 'bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg';

  const headerBg = theme === 'dark' 
    ? 'bg-black/80 backdrop-blur-xl' 
    : 'bg-white/80 backdrop-blur-xl border-b border-slate-200';

  // FAQ Categories
  const faqCategories = [
    {
      id: 'general',
      title: 'General Questions',
      icon: HelpCircle,
      items: [
        {
          id: 'what-is',
          question: 'What is Demly POS?',
          answer: 'Demly POS is a complete business management system designed for restaurants, retail stores, salons, and warehouses. It includes point of sale, inventory management, customer management, appointment booking, and detailed analytics.'
        },
        {
          id: 'who-is-it-for',
          question: 'Who is Demly POS for?',
          answer: 'Demly POS is perfect for businesses of all sizes, from small independent shops to large multi-location enterprises. We serve restaurants, cafes, retail stores, salons, barbershops, food trucks, bakeries, and warehouses.'
        },
        {
          id: 'multi-location',
          question: 'Can I use Demly POS for multiple locations?',
          answer: 'Yes! Demly POS supports multi-location management. You can manage inventory, staff, and sales across all your locations from a single dashboard.'
        }
      ]
    },
    {
      id: 'billing',
      title: 'Billing & Subscriptions',
      icon: CreditCard,
      items: [
        {
          id: 'refund',
          question: 'Can I get a refund?',
          answer: 'The moment your subscription starts, you get a 14-day cooling period in which you can cancel and get a full refund. After the 14-day period, refunds are handled on a case-by-case basis. Contact support@demly.com for more assistance.'
        },
        {
          id: 'pricing',
          question: 'How much does Demly POS cost?',
          answer: 'We offer two plans: Monthly at £29/month and Annual at £299/year (saving £49). Both plans include all features with no hidden fees. You can cancel anytime.'
        },
        {
          id: 'cancel',
          question: 'How do I cancel my subscription?',
          answer: 'You can cancel your subscription at any time from your account settings. If you cancel, you will still have access until the end of your billing period. During the 14-day cooling period, you will receive a full refund.'
        },
        {
          id: 'payment-methods',
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit and debit cards (Visa, Mastercard, American Express) via our secure Stripe payment processing.'
        }
      ]
    },
    {
      id: 'features',
      title: 'Features & Functionality',
      icon: Zap,
      items: [
        {
          id: 'hardware',
          question: 'What hardware do I need?',
          answer: 'Demly POS works with standard computers, tablets, and smartphones. For printing receipts, we support thermal printers via USB, network, WiFi, and Bluetooth connections. We also support barcode scanners and cash drawers.'
        },
        {
          id: 'offline',
          question: 'Does it work offline?',
          answer: 'Yes! Demly POS has offline mode that allows you to continue processing transactions even without an internet connection. Once you reconnect, all data automatically syncs to the cloud.'
        },
        {
          id: 'appointments',
          question: 'How does the appointment system work?',
          answer: 'Our appointment system allows customers to book online, and staff to manage their schedules. You can set service durations, staff availability, and send automatic reminders to reduce no-shows.'
        }
      ]
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      icon: Shield,
      items: [
        {
          id: 'data-security',
          question: 'How secure is my data?',
          answer: 'We take security seriously. All data is encrypted end-to-end, we are PCI DSS compliant for payment processing, and we perform regular security audits. Your business data is backed up automatically and securely stored in the cloud.'
        },
        {
          id: 'gdpr',
          question: 'Are you GDPR compliant?',
          answer: 'Yes, Demly POS is fully GDPR compliant. We handle all customer data according to GDPR guidelines, and you can request data deletion at any time.'
        }
      ]
    },
    {
      id: 'support',
      title: 'Support & Help',
      icon: Mail,
      items: [
        {
          id: 'support-hours',
          question: 'When is support available?',
          answer: 'Our support team is available Monday to Friday, 9am to 6pm GMT. For urgent issues, we offer 24/7 emergency support for critical system problems.'
        },
        {
          id: 'contact-support',
          question: 'How do I contact support?',
          answer: 'You can reach us at support@demly.com or call +44 20 1234 5678. We typically respond to all inquiries within 24 hours.'
        }
      ]
    }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${bgColor}`}>
      {/* Header */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-2 shadow-xl' : 'py-3'} ${headerBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="group flex-shrink-0">
              <Logo size={isMobile ? "large" : "large"} />
            </Link>
            
            <div className="md:hidden flex items-center gap-2">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-slate-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
              </button>
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-2 rounded-full ${theme === 'dark' ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-700 hover:text-black hover:bg-black/5'} transition-colors`}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
            
            <div className="hidden md:flex items-center gap-3">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-slate-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
              </button>
              <Link 
                href="/login" 
                className={`px-5 py-2.5 rounded-full font-semibold text-sm lg:text-base transition-colors ${
                  theme === 'dark' 
                    ? 'text-slate-300 hover:text-white hover:bg-white/10' 
                    : 'text-slate-600 hover:text-black hover:bg-black/5'
                }`}
              >
                Sign In
              </Link>
              <Link 
                href="/register" 
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-full font-bold text-white transition-colors text-sm lg:text-base shadow-lg shadow-emerald-600/20"
              >
                Get Started
              </Link>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden mt-4 border-t border-slate-200 dark:border-white/10 pt-4"
              >
                <div className="flex flex-col space-y-2">
                  <Link 
                    href="/login" 
                    className={`px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                      theme === 'dark' 
                        ? 'text-slate-300 hover:text-white hover:bg-white/10' 
                        : 'text-slate-600 hover:text-black hover:bg-black/5'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <div className="border-t border-slate-200 dark:border-white/10 pt-4 mt-2">
                    <Link 
                      href="/register" 
                      className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white text-center py-3 rounded-xl font-bold"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Get Started
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-28 md:pt-32 pb-16 md:pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span className={`text-emerald-400 text-xs md:text-sm font-semibold ${theme === 'light' ? 'text-emerald-600' : ''}`}>
                Frequently Asked Questions
              </span>
            </div>
            
            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black mb-4 ${textPrimary}`}>
              How Can <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">We Help?</span>
            </h1>
            
            <p className={`text-lg ${textSecondary} max-w-2xl mx-auto`}>
              Find answers to common questions about Demly POS, billing, features, and support.
            </p>
          </motion.div>

          {/* FAQ Categories */}
          <div className="space-y-8">
            {faqCategories.map((category, categoryIndex) => {
              const Icon = category.icon;
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: categoryIndex * 0.1 }}
                  className={`${cardBg} rounded-3xl p-6 border`}
                >
                  {/* Category Header */}
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/30">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                      <Icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className={`text-xl font-bold ${textPrimary}`}>{category.title}</h2>
                  </div>

                  {/* FAQ Items */}
                  <div className="space-y-3">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-xl border ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'} overflow-hidden`}
                      >
                        <button
                          onClick={() => toggleItem(item.id)}
                          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-800/20 transition-colors"
                        >
                          <span className={`font-medium ${textPrimary}`}>{item.question}</span>
                          {openItems.includes(item.id) ? (
                            <ChevronUp className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-emerald-600" />
                          )}
                        </button>
                        
                        <AnimatePresence>
                          {openItems.includes(item.id) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="px-6 pb-4"
                            >
                              <p className={`${textSecondary} text-sm leading-relaxed`}>
                                {item.answer}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Still Have Questions */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className={`mt-12 ${cardBg} rounded-3xl p-8 border text-center`}
          >
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${textPrimary}`}>Still Have Questions?</h2>
            <p className={`${textSecondary} mb-6 max-w-md mx-auto`}>
              Can't find the answer you're looking for? Please chat with our friendly team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-semibold transition-colors shadow-lg shadow-emerald-600/20"
              >
                Contact Support
              </Link>
              <a
                href="mailto:support@demly.com"
                className={`px-6 py-3 rounded-full font-semibold transition-colors ${
                  theme === 'dark' 
                    ? 'bg-white/5 hover:bg-white/10 text-white' 
                    : 'bg-emerald-50 hover:bg-emerald-100 text-slate-900'
                }`}
              >
                Email Us
              </a>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 flex flex-wrap gap-4 justify-center"
          >
            <Link href="/privacy" className={`text-xs ${textMuted} hover:text-emerald-600 transition-colors`}>
              Privacy Policy
            </Link>
            <span className={`text-xs ${textMuted}`}>•</span>
            <Link href="/terms" className={`text-xs ${textMuted} hover:text-emerald-600 transition-colors`}>
              Terms of Service
            </Link>
            <span className={`text-xs ${textMuted}`}>•</span>
            <Link href="/industries" className={`text-xs ${textMuted} hover:text-emerald-600 transition-colors`}>
              Industries
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className={`py-12 px-4 sm:px-6 border-t ${theme === 'dark' ? 'bg-black border-white/5' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <div className="mb-4">
                <Logo size="large" />
              </div>
              <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-sm`}>
                © 2025 Demly. All rights reserved.
              </p>
            </div>
            <div className={`flex flex-wrap gap-4 sm:gap-6 md:gap-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-sm justify-center`}>
              <Link href="/privacy" className="hover:text-emerald-600 transition-colors px-3 py-1 rounded-full hover:bg-emerald-50/10">Privacy</Link>
              <Link href="/terms" className="hover:text-emerald-600 transition-colors px-3 py-1 rounded-full hover:bg-emerald-50/10">Terms</Link>
              <Link href="/contact" className="hover:text-emerald-600 transition-colors px-3 py-1 rounded-full hover:bg-emerald-50/10">Contact</Link>
              <Link href="/industries" className="hover:text-emerald-600 transition-colors px-3 py-1 rounded-full hover:bg-emerald-50/10">Industries</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}