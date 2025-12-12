"use client";

import { CheckCircle, Mail, Key } from "lucide-react";
import Link from "next/link";

export default function Success() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center p-4">
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-12 max-w-2xl w-full border border-slate-800/50 text-center shadow-2xl">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 blur-3xl opacity-20 animate-pulse-glow"></div>
          <CheckCircle className="w-24 h-24 text-emerald-400 mx-auto relative z-10" />
        </div>
        
        <h1 className="text-5xl font-black text-white mb-4">
          Payment Successful!
        </h1>
        
        <p className="text-xl text-slate-300 mb-8">
          Thank you for purchasing Demly POS!
        </p>

        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 mb-8 space-y-6 border border-slate-700/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-white mb-2">Check Your Email</h3>
              <p className="text-slate-400">
                Your license key has been sent to your email address. It should arrive within a few minutes.
              </p>
            </div>
          </div>

          <div className="h-px bg-slate-700/50"></div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
              <Key className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-white mb-2">Activate Your License</h3>
              <p className="text-slate-400">
                Create an account or sign in, then enter your license key to start using Demly POS.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Link
            href="/register"
            className="block w-full bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white font-bold py-4 rounded-xl transition-all text-lg shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/40"
          >
            Create Account & Activate
          </Link>
          
          <Link
            href="/login"
            className="block w-full bg-slate-800/50 hover:bg-slate-700/50 text-white font-bold py-4 rounded-xl transition-all text-lg border border-slate-700/50 hover:border-slate-600/50"
          >
            Already Have an Account? Sign In
          </Link>
        </div>

        <div className="mt-8 text-slate-500 text-sm">
          <p>Didn't receive your license key?</p>
          <p>Check your spam folder or contact support@demly.com</p>
        </div>
      </div>
    </div>
  );
}