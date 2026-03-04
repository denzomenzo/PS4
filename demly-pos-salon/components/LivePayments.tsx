// components/LivePayments.tsx
"use client";

import { useEffect, useState } from 'react';
import { useUserId } from '@/hooks/useUserId';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface PaymentEvent {
  type: 'payment_success' | 'payment_failed';
  amount: number;
  date: string;
  attempt: number;
}

export function LivePayments() {
  const userId = useUserId();
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const eventSource = new EventSource(`/api/webhooks/stripe?userId=${userId}`);

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'connected') return;
      
      setEvents(prev => [data, ...prev].slice(0, 10));
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [userId]);

  if (!connected) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <p className="text-sm text-yellow-600">Connecting to payment stream...</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        Live Payment Status
      </h3>
      
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No recent payment activity
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((event, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-2 rounded-lg ${
                event.type === 'payment_success'
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {event.type === 'payment_success' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {event.type === 'payment_success' ? 'Payment Received' : `Payment Failed (Attempt ${event.attempt})`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(event.date).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-foreground">
                £{event.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}