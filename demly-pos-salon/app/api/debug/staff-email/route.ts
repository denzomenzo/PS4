// app/api/debug/staff-email/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const staffCookie = cookieStore.get('current_staff')?.value;
  
  if (!staffCookie) {
    return NextResponse.json({ error: 'No staff cookie found' });
  }
  
  try {
    const staff = JSON.parse(decodeURIComponent(staffCookie));
    return NextResponse.json({ 
      staff,
      email: staff.email,
      name: staff.name,
      role: staff.role
    });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid staff cookie', cookie: staffCookie });
  }
}