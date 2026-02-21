// app/api/debug/licenses-all/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    // Use service role client for database access
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return null; },
          set() {},
          remove() {},
        },
      }
    );

    // Get all licenses (limit 10)
    const { data: licenses, error } = await supabase
      .from('licenses')
      .select('id, email, plan_type, status, created_at')
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message });
    }

    return NextResponse.json({ 
      licenses,
      count: licenses?.length || 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}