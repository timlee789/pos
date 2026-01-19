import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const READER_ID = process.env.STRIPE_TERMINAL_READER_ID;

export async function POST(request: Request) {
  try {
    const { amount } = await request.json();

    if (!READER_ID) {
      throw new Error("Reader ID is not configured");
    }

    console.log(`💳 Initiating Payment: $${amount}`);

    // 1. PaymentIntent 생성
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
    });

    // 2. 단말기에 결제 요청 전송
    await stripe.terminal.readers.processPaymentIntent(READER_ID, {
      payment_intent: paymentIntent.id,
    });

    console.log("📡 Reader Activated. Returned ID to client.");

    // 3. ★ 기다리지 않고 바로 ID 반환 (타임아웃 방지)
    return NextResponse.json({ 
      success: true, 
      paymentIntentId: paymentIntent.id 
    });

  } catch (error: any) {
    console.error("❌ Stripe Process Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}