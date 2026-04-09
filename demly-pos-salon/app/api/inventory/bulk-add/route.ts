import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, products } = body;

    if (!sessionId || !products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'No products provided' }, { status: 400 });
    }

    // Get session to verify it's valid and get user_id
    const { data: session, error: sessionError } = await supabase
      .from('mobile_scan_sessions')
      .select('user_id, expires_at')
      .eq('session_id', sessionId)
      .single();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 404 });
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      await supabase
        .from('mobile_scan_sessions')
        .delete()
        .eq('session_id', sessionId);
      
      return NextResponse.json({ error: 'Session expired' }, { status: 404 });
    }

    // Insert all products
    const productsToInsert = products.map(p => ({
      user_id: session.user_id,
      name: p.name,
      barcode: p.barcode,
      stock_quantity: p.infiniteStock ? -1 : (p.quantity || 1),
      track_inventory: !p.infiniteStock,
      has_infinite_stock: p.infiniteStock || false,
      price: 0, // Default price, user can edit later
      cost: 0,
      low_stock_threshold: p.infiniteStock ? 0 : 10,
      is_service: false
    }));

    const { error } = await supabase
      .from('products')
      .insert(productsToInsert);

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Delete the session after successful product addition
    await supabase
      .from('mobile_scan_sessions')
      .delete()
      .eq('session_id', sessionId);

    return NextResponse.json({ 
      success: true, 
      count: products.length 
    });
  } catch (error) {
    console.error('Error bulk adding products:', error);
    return NextResponse.json(
      { error: 'Failed to add products' }, 
      { status: 500 }
    );
  }
}
