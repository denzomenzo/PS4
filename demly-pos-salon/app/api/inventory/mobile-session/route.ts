import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Use a more persistent store
declare global {
  var activeSessions: Map<string, {
    userId: string;
    createdAt: number;
    products: Array<any>;
  }>;
}

if (!global.activeSessions) {
  global.activeSessions = new Map();
}

function generateSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No auth token' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const sessionId = generateSessionCode();
    
    // Store session
    global.activeSessions.set(sessionId, {
      userId: user.id,
      createdAt: Date.now(),
      products: []
    });

    console.log('Session created:', sessionId);
    console.log('Active sessions:', Array.from(global.activeSessions.keys()));
    
    return NextResponse.json({ 
      sessionId,
      qrCode: `https://demly.co.uk/scan?session=${sessionId}`
    });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const action = searchParams.get('action');

    console.log('GET request:', { sessionId, action });
    console.log('Available sessions:', Array.from(global.activeSessions.keys()));

    if (!sessionId) {
      return NextResponse.json({ error: 'No session ID' }, { status: 400 });
    }

    const session = global.activeSessions.get(sessionId);
    
    if (!session) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Session not found',
        availableSessions: Array.from(global.activeSessions.keys())
      }, { status: 404 });
    }

    if (action === 'products') {
      return NextResponse.json({ products: session.products });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const body = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'No session ID' }, { status: 400 });
    }

    const session = global.activeSessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    session.products.push({
      ...body,
      timestamp: Date.now()
    });

    return NextResponse.json({ success: true, product: body });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
