import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Use global to persist sessions across API calls
declare global {
  var activeSessions: Map<string, {
    userId: string;
    createdAt: number;
    products: Array<{
      name: string;
      barcode: string;
      quantity: number;
      infiniteStock: boolean;
      timestamp: number;
    }>;
  }>;
}

// Initialize global sessions map if it doesn't exist
if (!global.activeSessions) {
  global.activeSessions = new Map();
}

// Clean up old sessions (older than 1 hour)
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of global.activeSessions.entries()) {
    if (now - session.createdAt > 3600000) {
      global.activeSessions.delete(sessionId);
      console.log('Cleaned up expired session:', sessionId);
    }
  }
}, 300000); // Clean every 5 minutes

// Generate a short session code (6 characters)
function generateSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST - Create a new mobile scanning session
export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const sessionId = generateSessionCode();
    
    // Store session
    global.activeSessions.set(sessionId, {
      userId: user.id,
      createdAt: Date.now(),
      products: []
    });

    console.log('Session created:', sessionId, 'for user:', user.id);
    console.log('Active sessions count:', global.activeSessions.size);
    
    return NextResponse.json({ 
      sessionId,
      qrCode: `https://demly.co.uk/dashboard/scan?session=${sessionId}`
    });
  } catch (error) {
    console.error('POST error:', error);
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

    console.log('GET request:', { sessionId, action });

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const session = global.activeSessions.get(sessionId);
    
    if (!session) {
      console.log('Session not found:', sessionId);
      console.log('Available sessions:', Array.from(global.activeSessions.keys()));
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid or expired session' 
      }, { status: 404 });
    }

    // Check if session is expired
    if (Date.now() - session.createdAt > 3600000) {
      global.activeSessions.delete(sessionId);
      return NextResponse.json({ 
        valid: false, 
        error: 'Session expired' 
      }, { status: 404 });
    }

    if (action === 'products') {
      return NextResponse.json({ 
        valid: true,
        products: session.products 
      });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
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

    const session = global.activeSessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 404 });
    }

    // Check if session is expired
    if (Date.now() - session.createdAt > 3600000) {
      global.activeSessions.delete(sessionId);
      return NextResponse.json({ error: 'Session expired' }, { status: 404 });
    }

    const body = await request.json();
    const { name, barcode, quantity, infiniteStock } = body;

    if (!name || !barcode) {
      return NextResponse.json({ error: 'Name and barcode are required' }, { status: 400 });
    }

    const product = {
      name: name.trim(),
      barcode: barcode.trim(),
      quantity: quantity || 1,
      infiniteStock: infiniteStock || false,
      timestamp: Date.now()
    };

    session.products.push(product);
    global.activeSessions.set(sessionId, session);

    console.log('Product added to session:', sessionId, product);

    return NextResponse.json({ 
      success: true, 
      product,
      productCount: session.products.length
    });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
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

    const session = global.activeSessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (productIndex !== null) {
      // Remove specific product
      const index = parseInt(productIndex);
      if (index >= 0 && index < session.products.length) {
        session.products.splice(index, 1);
        global.activeSessions.set(sessionId, session);
        console.log('Product removed from session:', sessionId, 'index:', index);
        return NextResponse.json({ 
          success: true, 
          productCount: session.products.length 
        });
      } else {
        return NextResponse.json({ error: 'Invalid product index' }, { status: 400 });
      }
    } else {
      // Delete entire session
      global.activeSessions.delete(sessionId);
      console.log('Session deleted:', sessionId);
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

// OPTIONS - Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
