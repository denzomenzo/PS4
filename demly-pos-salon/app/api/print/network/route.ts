// app/api/print/network/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as net from 'net';

export async function POST(request: NextRequest) {
  try {
    const { ipAddress, port, data } = await request.json();

    if (!ipAddress || !data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`📡 Sending to network printer: ${ipAddress}:${port || 9100}`);
    console.log(`📄 Data length: ${data.length} characters`);

    // Send data to network printer via TCP/IP
    await new Promise<void>((resolve, reject) => {
      const client = new net.Socket();
      let dataSent = false;
      
      client.connect(port || 9100, ipAddress, () => {
        console.log('✅ Connected to printer');
        client.write(data);
        dataSent = true;
        console.log('✅ Data sent to printer');
        client.end();
      });

      client.on('close', () => {
        console.log('✅ Connection closed');
        if (dataSent) {
          resolve();
        }
      });

      client.on('error', (error) => {
        console.error('❌ Socket error:', error);
        reject(error);
      });

      client.on('timeout', () => {
        console.error('❌ Connection timeout');
        client.destroy();
        reject(new Error('Connection timeout'));
      });

      // Timeout after 5 seconds
      client.setTimeout(5000);
    });

    return NextResponse.json({ 
      success: true,
      message: 'Print job sent to printer'
    });

  } catch (error: any) {
    console.error('❌ Network print error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to print',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}