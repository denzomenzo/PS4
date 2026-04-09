import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, products } = body;

    if (!sessionId || !products || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Insert all products
    const productsToInsert = products.map(p => ({
      user_id: user.id,
      name: p.name,
      barcode: p.barcode,
      stock_quantity: p.infiniteStock ? -1 : p.quantity,
      track_inventory: !p.infiniteStock,
      has_infinite_stock: p.infiniteStock,
      price: 0, // Default price, user can edit later
      cost: 0,
      low_stock_threshold: p.infiniteStock ? 0 : 10,
      is_service: false
    }));

    const { error } = await supabase
      .from('products')
      .insert(productsToInsert);

    if (error) throw error;

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