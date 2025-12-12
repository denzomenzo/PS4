"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ShoppingCart, Check } from 'lucide-react';

interface CartItem {
  icon: string;
  name: string;
  price: number;
  quantity: number;
}

export default function CustomerDisplay() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [vat, setVat] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [shopName, setShopName] = useState("Welcome");

  useEffect(() => {
    loadSettings();
    const channel = supabase.channel('customer-display')
      .on('broadcast', { event: 'cart-update' }, (payload: any) => {
        if (payload.payload) {
          setCart(payload.payload.cart || []);
          setTotal(payload.payload.total || 0);
          setVat(payload.payload.vat || 0);
          setGrandTotal(payload.payload.grandTotal || 0);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('settings')
      .select('shop_name')
      .single();
    if (data?.shop_name) setShopName(data.shop_name);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white flex items-center justify-center p-8">
      <div className="w-full max-w-5xl">
        
        {/* Logo/Shop Name */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400 mb-4 drop-shadow-2xl">
            {shopName}
          </h1>
          <p className="text-2xl text-slate-400 font-medium">Thank you for shopping with us</p>
        </div>

        {cart.length === 0 ? (
          /* Ready State */
          <div className="bg-slate-800/30 backdrop-blur-xl border-2 border-slate-700/50 rounded-[3rem] p-20 text-center shadow-2xl animate-fade-in">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 blur-3xl opacity-20 animate-pulse-glow"></div>
              <div className="bg-emerald-500/20 w-48 h-48 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500/50 relative z-10 shadow-2xl shadow-emerald-500/20">
                <Check className="w-32 h-32 text-emerald-400" />
              </div>
            </div>
            <h2 className="text-6xl font-black mb-4 text-white">Ready</h2>
            <p className="text-3xl text-slate-400">Your items will appear here</p>
          </div>
        ) : (
          /* Shopping Cart Display */
          <div className="space-y-6 animate-fade-in">
            {/* Items List */}
            <div className="bg-slate-800/30 backdrop-blur-xl border-2 border-slate-700/50 rounded-[3rem] p-8 shadow-2xl">
              <h2 className="text-4xl font-black mb-6 flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-2xl shadow-lg shadow-cyan-500/20">
                  <ShoppingCart className="w-10 h-10" />
                </div>
                Your Items ({cart.length})
              </h2>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {cart.map((item, index) => (
                  <div 
                    key={index}
                    className="bg-slate-900/50 backdrop-blur-lg rounded-2xl p-6 flex items-center justify-between border border-slate-700/50 hover:border-cyan-500/50 transition-all shadow-lg"
                  >
                    <div className="flex items-center gap-6">
                      {item.icon && <span className="text-5xl drop-shadow-lg">{item.icon}</span>}
                      <div>
                        <h3 className="text-3xl font-bold">{item.name}</h3>
                        <p className="text-xl text-slate-400 font-medium">£{item.price.toFixed(2)} × {item.quantity}</p>
                      </div>
                    </div>
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                      £{(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Display */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border-2 border-slate-700/50 rounded-[3rem] p-10 shadow-2xl">
              <div className="space-y-4">
                <div className="flex justify-between text-3xl text-slate-300">
                  <span className="font-semibold">Subtotal</span>
                  <span className="font-bold">£{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-3xl text-slate-300">
                  <span className="font-semibold">VAT (20%)</span>
                  <span className="font-bold">£{vat.toFixed(2)}</span>
                </div>
                <div className="h-1 bg-gradient-to-r from-slate-700 to-slate-600 rounded-full my-6"></div>
                <div className="flex justify-between items-center">
                  <span className="text-5xl font-black text-white">Total</span>
                  <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 drop-shadow-2xl">
                    £{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center animate-fade-in">
          <p className="text-xl text-slate-500">
            Please wait while your transaction is being processed
          </p>
        </div>

      </div>
    </div>
  );
}