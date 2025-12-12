// lib/cardTerminal.ts
// Universal Card Terminal Integration for Demly POS
// Supports: Stripe Terminal, Square, SumUp, Zettle, PayPal Zettle, Clover

export type TerminalProvider = 
  | "stripe"
  | "square" 
  | "sumup"
  | "zettle"
  | "paypal_zettle"
  | "clover"
  | "manual"; // Manual card entry fallback

export interface TerminalConfig {
  provider: TerminalProvider;
  apiKey?: string;
  merchantId?: string;
  locationId?: string;
  deviceId?: string;
  testMode?: boolean;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  last4?: string;
  cardBrand?: string;
  error?: string;
  receiptData?: any;
}

// ========================================
// STRIPE TERMINAL
// ========================================
class StripeTerminalHandler {
  private terminal: any = null;
  private config: TerminalConfig;

  constructor(config: TerminalConfig) {
    this.config = config;
  }

  async initialize() {
    // Load Stripe Terminal JS SDK
    if (typeof window === "undefined") return;
    
    // @ts-ignore
    if (!window.StripeTerminal) {
      await this.loadStripeTerminalSDK();
    }

    // @ts-ignore
    this.terminal = window.StripeTerminal.create({
      onFetchConnectionToken: async () => {
        // Call your backend to create a connection token
        const response = await fetch("/api/stripe-terminal/token", {
          method: "POST",
        });
        const data = await response.json();
        return data.secret;
      },
      onUnexpectedReaderDisconnect: () => {
        console.log("Reader disconnected");
      },
    });
  }

  private async loadStripeTerminalSDK() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/terminal/v1/";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async discoverReaders() {
    if (!this.terminal) await this.initialize();
    
    const config = { simulated: this.config.testMode || false };
    const discoverResult = await this.terminal.discoverReaders(config);
    return discoverResult.discoveredReaders || [];
  }

  async connectReader(reader: any) {
    if (!this.terminal) await this.initialize();
    await this.terminal.connectReader(reader);
  }

  async processPayment(amount: number, currency: string = "gbp"): Promise<PaymentResult> {
    try {
      if (!this.terminal) await this.initialize();

      // Create payment intent on your backend
      const response = await fetch("/api/stripe-terminal/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.round(amount * 100), currency }),
      });
      
      const { client_secret } = await response.json();

      // Collect payment method
      const result = await this.terminal.collectPaymentMethod(client_secret);
      
      if (result.error) {
        return {
          success: false,
          amount,
          currency,
          paymentMethod: "card",
          error: result.error.message,
        };
      }

      // Process payment
      const confirmResult = await this.terminal.processPayment(result.paymentIntent);
      
      if (confirmResult.error) {
        return {
          success: false,
          amount,
          currency,
          paymentMethod: "card",
          error: confirmResult.error.message,
        };
      }

      return {
        success: true,
        transactionId: confirmResult.paymentIntent.id,
        amount,
        currency,
        paymentMethod: "card",
        last4: confirmResult.paymentIntent.charges.data[0]?.payment_method_details?.card_present?.last4,
        cardBrand: confirmResult.paymentIntent.charges.data[0]?.payment_method_details?.card_present?.brand,
      };
    } catch (error: any) {
      return {
        success: false,
        amount,
        currency,
        paymentMethod: "card",
        error: error.message,
      };
    }
  }
}

// ========================================
// SQUARE TERMINAL
// ========================================
class SquareTerminalHandler {
  private config: TerminalConfig;

  constructor(config: TerminalConfig) {
    this.config = config;
  }

  async initialize() {
    // Load Square Web Payments SDK
    // Implementation depends on Square's Terminal API
  }

  async processPayment(amount: number, currency: string = "GBP"): Promise<PaymentResult> {
    try {
      // Call your backend which uses Square Terminal API
      const response = await fetch("/api/square-terminal/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency,
          device_id: this.config.deviceId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          transactionId: data.payment_id,
          amount,
          currency,
          paymentMethod: "card",
          last4: data.last4,
          cardBrand: data.card_brand,
        };
      } else {
        return {
          success: false,
          amount,
          currency,
          paymentMethod: "card",
          error: data.error,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        amount,
        currency,
        paymentMethod: "card",
        error: error.message,
      };
    }
  }
}

// ========================================
// SUMUP TERMINAL
// ========================================
class SumUpTerminalHandler {
  private config: TerminalConfig;

  constructor(config: TerminalConfig) {
    this.config = config;
  }

  async processPayment(amount: number, currency: string = "GBP"): Promise<PaymentResult> {
    try {
      // SumUp typically uses deep linking to their app
      const checkoutId = `demly-${Date.now()}`;
      
      const response = await fetch("/api/sumup-terminal/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency,
          checkout_reference: checkoutId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          transactionId: data.transaction_code,
          amount,
          currency,
          paymentMethod: "card",
        };
      } else {
        return {
          success: false,
          amount,
          currency,
          paymentMethod: "card",
          error: data.message,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        amount,
        currency,
        paymentMethod: "card",
        error: error.message,
      };
    }
  }
}

// ========================================
// ZETTLE / PAYPAL ZETTLE
// ========================================
class ZettleTerminalHandler {
  private config: TerminalConfig;

  constructor(config: TerminalConfig) {
    this.config = config;
  }

  async processPayment(amount: number, currency: string = "GBP"): Promise<PaymentResult> {
    try {
      // Zettle uses their SDK or deep linking
      const response = await fetch("/api/zettle-terminal/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency,
        }),
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          transactionId: data.transaction_id,
          amount,
          currency,
          paymentMethod: "card",
        };
      } else {
        return {
          success: false,
          amount,
          currency,
          paymentMethod: "card",
          error: data.error,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        amount,
        currency,
        paymentMethod: "card",
        error: error.message,
      };
    }
  }
}

// ========================================
// CLOVER TERMINAL
// ========================================
class CloverTerminalHandler {
  private config: TerminalConfig;

  constructor(config: TerminalConfig) {
    this.config = config;
  }

  async processPayment(amount: number, currency: string = "USD"): Promise<PaymentResult> {
    try {
      // Clover uses their Connector API
      const response = await fetch("/api/clover-terminal/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency,
        }),
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          transactionId: data.payment_id,
          amount,
          currency,
          paymentMethod: "card",
          last4: data.last4,
          cardBrand: data.card_type,
        };
      } else {
        return {
          success: false,
          amount,
          currency,
          paymentMethod: "card",
          error: data.result,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        amount,
        currency,
        paymentMethod: "card",
        error: error.message,
      };
    }
  }
}

// ========================================
// MAIN TERMINAL MANAGER
// ========================================
export class CardTerminalManager {
  private handler: any;
  private config: TerminalConfig;

  constructor(config: TerminalConfig) {
    this.config = config;
    this.initializeHandler();
  }

  private initializeHandler() {
    switch (this.config.provider) {
      case "stripe":
        this.handler = new StripeTerminalHandler(this.config);
        break;
      case "square":
        this.handler = new SquareTerminalHandler(this.config);
        break;
      case "sumup":
        this.handler = new SumUpTerminalHandler(this.config);
        break;
      case "zettle":
      case "paypal_zettle":
        this.handler = new ZettleTerminalHandler(this.config);
        break;
      case "clover":
        this.handler = new CloverTerminalHandler(this.config);
        break;
      default:
        throw new Error(`Unsupported terminal provider: ${this.config.provider}`);
    }
  }

  async initialize() {
    if (this.handler.initialize) {
      await this.handler.initialize();
    }
  }

  async discoverReaders() {
    if (this.handler.discoverReaders) {
      return await this.handler.discoverReaders();
    }
    return [];
  }

  async connectReader(reader: any) {
    if (this.handler.connectReader) {
      await this.handler.connectReader(reader);
    }
  }

  async processPayment(amount: number, currency: string = "GBP"): Promise<PaymentResult> {
    return await this.handler.processPayment(amount, currency);
  }

  async cancelPayment() {
    if (this.handler.cancelPayment) {
      await this.handler.cancelPayment();
    }
  }
}

// ========================================
// USAGE EXAMPLE
// ========================================
/*
// Initialize terminal
const terminal = new CardTerminalManager({
  provider: "stripe",
  apiKey: "pk_test_...",
  testMode: true,
});

await terminal.initialize();

// Discover and connect to readers
const readers = await terminal.discoverReaders();
if (readers.length > 0) {
  await terminal.connectReader(readers[0]);
}

// Process payment
const result = await terminal.processPayment(49.99, "GBP");

if (result.success) {
  console.log("Payment successful!", result.transactionId);
} else {
  console.error("Payment failed:", result.error);
}
*/