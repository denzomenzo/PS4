import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get('id');
  
  if (!transactionId) {
    return new NextResponse('Missing transaction ID', { status: 400 });
  }

  // Initialize Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Fetch transaction data
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .select('*, products:transaction_items(*, product:products(*))')
    .eq('id', transactionId)
    .single();
    
  if (transactionError || !transaction) {
    return new NextResponse('Transaction not found', { status: 404 });
  }
  
  // Fetch customer data
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', transaction.customer_id)
    .single();
    
  // Fetch receipt settings
  const { data: receiptSettings } = await supabase
    .from('receipt_settings')
    .select('*')
    .single();
    
  // Fetch business info
  const { data: businessInfo } = await supabase
    .from('business_settings')
    .select('*')
    .single();
    
  // Prepare receipt data
  const receiptData = {
    id: transaction.id,
    created_at: transaction.created_at,
    subtotal: transaction.subtotal,
    vat: transaction.vat,
    total: transaction.total,
    payment_method: transaction.payment_method,
    payment_status: transaction.status,
    notes: transaction.notes,
    products: transaction.products?.map((item: any) => ({
      id: item.product?.id,
      name: item.product?.name || 'Product',
      price: item.price,
      quantity: item.quantity,
      discount: item.discount || 0,
      total: (item.price * item.quantity) - (item.discount || 0)
    })) || [],
    customer: customer ? {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      balance: customer.balance
    } : null,
    businessInfo: {
      name: businessInfo?.business_name || 'Your Business',
      address: businessInfo?.business_address,
      phone: businessInfo?.business_phone,
      email: businessInfo?.business_email,
      taxNumber: businessInfo?.tax_number,
      logoUrl: businessInfo?.logo_url
    },
    receiptSettings: {
      fontSize: receiptSettings?.receipt_font_size || 12,
      footer: receiptSettings?.receipt_footer || 'Thank you for your business!',
      showBarcode: receiptSettings?.show_barcode_on_receipt !== false,
      barcodeType: receiptSettings?.barcode_type || 'CODE128',
      showTaxBreakdown: receiptSettings?.show_tax_breakdown !== false
    },
    balance_deducted: transaction.balance_deducted,
    payment_details: transaction.payment_details,
    staff_name: transaction.staff_name
  };
  
  // Return as JSON for the ReceiptPrint component
  return NextResponse.json(receiptData);
}