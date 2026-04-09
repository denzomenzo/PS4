import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

    const body = await request.json();
    const { products } = body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'No products provided' }, { status: 400 });
    }

    // Insert all products
    const productsToInsert = products.map(p => ({
      user_id: user.id,
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
