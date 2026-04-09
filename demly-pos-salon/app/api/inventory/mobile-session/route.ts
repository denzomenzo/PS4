import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for server operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Generate a short session code (6 characters)
function generateSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST - Create a new mobile scanning session (requires auth)
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
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    
    // Store session in Supabase
    const { error: insertError } = await supabase
      .from('mobile_scan_sessions')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        products: []
      });
    
    if (insertError) {
      console.error('Error creating session:', insertError);
      
      // If table doesn't exist, create it
      if (insertError.code === '42P01') {
        return NextResponse.json({ 
          error: 'Database table not found. Please create mobile_scan_sessions table.' 
        }, { status: 500 });
      }
      
      throw insertError;
    }

    console.log('Session created:', sessionId, 'for user:', user.id);
    
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

// GET - Get session data or products (no auth required - session ID is the token)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const action = searchParams.get('action');

    console.log('GET request:', { sessionId, action });

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get session from Supabase
    const { data: session, error } = await supabase
      .from('mobile_scan_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();
    
    if (error || !session) {
      console.log('Session not found:', sessionId, error);
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid or expired session' 
      }, { status: 404 });
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      // Delete expired session
      await supabase
        .from('mobile_scan_sessions')
        .delete()
        .eq('session_id', sessionId);
      
      return NextResponse.json({ 
        valid: false, 
        error: 'Session expired' 
      }, { status: 404 });
    }

    if (action === 'products') {
      return NextResponse.json({ 
        valid: true,
        products: session.products || [] 
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

// PUT - Add product to session (no auth required - session ID is the token)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, barcode, quantity, infiniteStock } = body;

    if (!name || !barcode) {
      return NextResponse.json({ error: 'Name and barcode are required' }, { status: 400 });
    }

    // Get current session
    const { data: session, error: getError } = await supabase
      .from('mobile_scan_sessions')
      .select('products, expires_at')
      .eq('session_id', sessionId)
      .single();
    
    if (getError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      await supabase
        .from('mobile_scan_sessions')
        .delete()
        .eq('session_id', sessionId);
      
      return NextResponse.json({ error: 'Session expired' }, { status: 404 });
    }

    const product = {
      name: name.trim(),
      barcode: barcode.trim(),
      quantity: quantity || 1,
      infiniteStock: infiniteStock || false,
      timestamp: Date.now()
    };

    const updatedProducts = [...(session.products || []), product];

    // Update session with new product
    const { error: updateError } = await supabase
      .from('mobile_scan_sessions')
      .update({ products: updatedProducts })
      .eq('session_id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      throw updateError;
    }

    console.log('Product added to session:', sessionId, product);

    return NextResponse.json({ 
      success: true, 
      product,
      productCount: updatedProducts.length
    });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

// DELETE - Clear session or remove product (no auth required)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const productIndex = searchParams.get('index');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    if (productIndex !== null) {
      // Remove specific product
      const { data: session, error: getError } = await supabase
        .from('mobile_scan_sessions')
        .select('products')
        .eq('session_id', sessionId)
        .single();
      
      if (getError || !session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      const products = session.products || [];
      const index = parseInt(productIndex);
      
      if (index >= 0 && index < products.length) {
        products.splice(index, 1);
        
        const { error: updateError } = await supabase
          .from('mobile_scan_sessions')
          .update({ products })
          .eq('session_id', sessionId);
        
        if (updateError) throw updateError;
        
        return NextResponse.json({ 
          success: true, 
          productCount: products.length 
        });
      }
    } else {
      // Delete entire session
      const { error: deleteError } = await supabase
        .from('mobile_scan_sessions')
        .delete()
        .eq('session_id', sessionId);
      
      if (deleteError) throw deleteError;
      
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
