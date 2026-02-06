import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ✨ PaymentIntent 상태를 확인하고 최종 결과를 반환하는 함수
async function confirmPaymentIntent(paymentIntentId: string, timeout = 25000): Promise<Stripe.PaymentIntent> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // 💡 상태가 'succeeded' 또는 'requires_capture'이면 성공으로 간주
    if (pi.status === 'succeeded' || pi.status === 'requires_capture') {
      return pi;
    }
    // 💡 최종 실패 상태이면 즉시 중단
    if (pi.status === 'canceled') {
      throw new Error('Payment was not successful. Status: ' + pi.status);
    }
    
    // 1초 대기 후 다시 확인
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 타임아웃 발생 시 마지막 상태 확인 후 실패 처리
  const lastPi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if(lastPi.status !== 'succeeded' && lastPi.status !== 'requires_capture') {
      try {
          await stripe.paymentIntents.cancel(paymentIntentId);
      } catch(cancelError) {
          console.error(`❌ Failed to cancel timed out payment intent ${paymentIntentId}:`, cancelError)
      }
      throw new Error('Payment confirmation timed out.');
  }
  return lastPi; // 타임아웃 직전에 성공한 경우
}


export async function POST(request: Request) {
  try {
    const { amount, source, orderId } = await request.json();

    let readerId = '';
    if (source === 'pos') {
        readerId = process.env.STRIPE_READER_ID_POS!;
    } else if (source === 'kiosk') {
        readerId = process.env.STRIPE_READER_ID_KIOSK!;
    }

    if (!readerId) {
      throw new Error(`Reader ID not configured for source: ${source}`);
    }

    console.log(`💳 [${source.toUpperCase()}] Initiating Payment on Reader: ${readerId} for Order: ${orderId}`);

    try {
      await stripe.terminal.readers.cancelAction(readerId);
    } catch (e) { /* 무시 */ }

    // ✨ 캡처 방법을 manual로 변경
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      payment_method_types: ['card_present'],
      capture_method: 'manual', // 💡 수동 캡처로 변경
      metadata: { orderId: orderId }
    });

    console.log(`⏳ [${orderId}] Created PaymentIntent: ${paymentIntent.id}. Processing on reader...`);

    await stripe.terminal.readers.processPaymentIntent(readerId, {
      payment_intent: paymentIntent.id,
    });
    
    console.log(`[${orderId}] Reader action complete. Waiting for payment confirmation...`);

    // ✨ confirmPaymentIntent 함수를 사용하여 결제 완료를 기다림
    const confirmedPi = await confirmPaymentIntent(paymentIntent.id);

    console.log(`[${orderId}] PaymentIntent ${confirmedPi.id} status: ${confirmedPi.status}. Capturing funds...`);

    // ✨ 결제 성공이 확인되면 수동으로 캡처
    const capturedPi = await stripe.paymentIntents.capture(confirmedPi.id);
    
    console.log(`✅ [${orderId}] Successfully captured payment for PaymentIntent: ${capturedPi.id}`);

    return NextResponse.json({ 
      success: true, 
      paymentIntentId: capturedPi.id,
      status: capturedPi.status
    });

  } catch (error: any) {
    console.error("❌ Stripe Process Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}