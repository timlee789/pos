import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    // ✨ 클라이언트에서 'source' ('pos' 또는 'kiosk')를 받음
    const { amount, source } = await request.json();

    // ✨ source에 따라 리더기 ID 선택
    let readerId = '';
    if (source === 'pos') {
        readerId = process.env.STRIPE_READER_ID_POS!;
    } else if (source === 'kiosk') {
        readerId = process.env.STRIPE_READER_ID_KIOSK!;
    }

    if (!readerId) {
      throw new Error(`Reader ID not configured for source: ${source}`);
    }

    console.log(`💳 [${source.toUpperCase()}] Initiating Payment on Reader: ${readerId}`);

    // 1. 리더기 상태 초기화 (혹시 켜져있을지 모를 이전 결제 취소)
    try {
      await stripe.terminal.readers.cancelAction(readerId);
    } catch (e) { /* 무시 */ }

    // 2. PaymentIntent 생성
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
    });

    // 3. 선택된 단말기로 결제 요청 전송
    await stripe.terminal.readers.processPaymentIntent(readerId, {
      payment_intent: paymentIntent.id,
    });

    return NextResponse.json({ 
      success: true, 
      paymentIntentId: paymentIntent.id 
    });

  } catch (error: any) {
    console.error("❌ Stripe Process Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}