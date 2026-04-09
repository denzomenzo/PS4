import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Store active sessions in memory
const activeSessions = new Map<string, {
  userId: string;
  createdAt: number;
  products: Array<{
    name: string;
    barcode: string;
    quantity?: number;
    infiniteStock?: boolean;
    timestamp: number;
  }>;
}>();

// Clean up old sessions (older than 1 hour)
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.createdAt > 3600000) {
      activeSessions.delete(sessionId);
    }
  }
}, 300000); // Clean every 5 minutes

// Generate a short session code
function generateSessionCode(): string {
  return randomBytes(3).toString('hex').toUpperCase(); // 6 character code
}

// Helper to get user from request
async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) return null;
  return user;
}

// POST - Create a new mobile scanning session
export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const sessionId = generateSessionCode();
    activeSessions.set(sessionId, {
      userId: user.id,
      createdAt: Date.now(),
      products: []
    });

    // Use the production URL
    const baseUrl = 'https://demly.co.uk';
    
    console.log('Created session:', sessionId, 'for user:', user.id);
    
    return NextResponse.json({ 
      sessionId,
      qrCode: `${baseUrl}/inventory/scan?session=${sessionId}`
    });
  } catch (error) {
    console.error('Error creating mobile session:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

// GET - Get session data or products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const action = searchParams.get('action');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 404 });
    }

    if (action === 'products') {
      return NextResponse.json({ products: session.products });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Add product to session
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 404 });
    }

    const body = await request.json();
    const { name, barcode, quantity, infiniteStock } = body;

    if (!name || !barcode) {
      return NextResponse.json({ error: 'Name and barcode are required' }, { status: 400 });
    }

    const product = {
      name,
      barcode,
      quantity: quantity || 1,
      infiniteStock: infiniteStock || false,
      timestamp: Date.now()
    };

    session.products.push(product);
    activeSessions.set(sessionId, session);

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Error adding product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Clear session or remove product
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const productIndex = searchParams.get('index');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    if (productIndex !== null) {
      const session = activeSessions.get(sessionId);
      if (session) {
        session.products.splice(parseInt(productIndex), 1);
        activeSessions.set(sessionId, session);
        return NextResponse.json({ success: true });
      }
    } else {
      activeSessions.delete(sessionId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
