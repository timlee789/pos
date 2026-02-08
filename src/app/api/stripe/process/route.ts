import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ✨ PaymentIntent 상태를 확인하고 최종 결과를 반환하는 함수 (기존 로직 유지)
async function confirmPaymentIntent(paymentIntentId: string, timeout = 25000): Promise<Stripe.PaymentIntent> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (pi.status === 'succeeded' || pi.status === 'requires_capture') {
      return pi;
    }
    if (pi.status === 'canceled') {
      throw new Error('Payment was not successful. Status: ' + pi.status);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const lastPi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if(lastPi.status !== 'succeeded' && lastPi.status !== 'requires_capture') {
      try {
          await stripe.paymentIntents.cancel(paymentIntentId);
      } catch(cancelError) {
          console.error(`❌ Failed to cancel timed out payment intent ${paymentIntentId}:`, cancelError)
      }
      throw new Error('Payment confirmation timed out.');
  }
  return lastPi;
}


export async function POST(request: Request) {
  try {
    const { amount, source, orderId, description } = await request.json();

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

    // PaymentIntent 생성
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      payment_method_types: ['card_present'],
      capture_method: 'manual', 
      description: description || `Order ${orderId}`,
      metadata: { 
          orderId: String(orderId), 
          source: source            
      }
    });

    console.log(`⏳ [${orderId}] Created PaymentIntent: ${paymentIntent.id}. Processing on reader...`);

    await stripe.terminal.readers.processPaymentIntent(readerId, {
      payment_intent: paymentIntent.id,
    });
    
    console.log(`[${orderId}] Reader action complete. Waiting for payment confirmation...`);

    // 결제 완료 대기
    const confirmedPi = await confirmPaymentIntent(paymentIntent.id);

    console.log(`[${orderId}] PaymentIntent ${confirmedPi.id} status: ${confirmedPi.status}. Capturing funds...`);

    // 수동 캡처 (팁이 포함된 최종 금액이 여기서 확정됨)
    const capturedPi = await stripe.paymentIntents.capture(confirmedPi.id);
    
    console.log(`✅ [${orderId}] Successfully captured payment for PaymentIntent: ${capturedPi.id}`);

    return NextResponse.json({ 
      success: true, 
      paymentIntentId: capturedPi.id,
      status: capturedPi.status,
      // ✨ [핵심 수정] 최종 결제된 금액(센트 단위)을 프론트엔드로 보냅니다.
      // 이걸 보내야 usePosLogic.ts에서 팁을 역계산할 수 있습니다.
      amountReceived: capturedPi.amount_received 
    });

  } catch (error: any) {
    console.error("❌ Stripe Process Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}