// app/api/printer/network/route.ts
import { NextRequest, NextResponse } from 'next/server';
import net from 'net';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { printerIp = '192.168.1.100', printerPort = 9100, escposData } = await request.json();
    
    if (!escposData || !Array.isArray(escposData)) {
      return NextResponse.json(
        { success: false, error: 'Missing ESC/POS data' },
        { status: 400 }
      );
    }
    
    // Convert array to Buffer
    const buffer = Buffer.from(escposData);
    
    // Create promise for socket connection with proper typing
    const printPromise = new Promise<Response>((resolve, reject) => {
      const client = new net.Socket();
      
      client.setTimeout(5000); // 5 second timeout
      
      client.connect(Number(printerPort), printerIp, () => {
        client.write(buffer);
        client.end();
        
        resolve(NextResponse.json({ 
          success: true, 
          message: 'Receipt sent to printer' 
        }));
      });
      
      client.on('error', (error) => {
        console.error('Printer connection error:', error);
        client.destroy();
        
        resolve(NextResponse.json({ 
          success: false, 
          error: `Printer connection failed: ${error.message}` 
        }, { status: 500 }));
      });
      
      client.on('timeout', () => {
        client.destroy();
        resolve(NextResponse.json({ 
          success: false, 
          error: 'Printer connection timeout' 
        }, { status: 500 }));
      });
    });
    
    return await printPromise;
    
  } catch (error: any) {
    console.error('Network printer API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
