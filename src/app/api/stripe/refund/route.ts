import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover', // 사용 중인 버전에 맞춤
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { orderId, paymentIntentId, amount } = await request.json();

    console.log(`💸 Refund Request: Order #${orderId}, Intent: ${paymentIntentId}`);

    // 1. Stripe에 환불 요청 (카드 결제인 경우만)
    if (paymentIntentId) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          // amount: amount * 100, // 전체 환불이면 금액 생략 가능 (자동으로 전액 환불)
        });
        console.log("✅ Stripe Refund Success:", refund.id);
      } catch (stripeError: any) {
        console.error("❌ Stripe Refund Failed:", stripeError);
        // 이미 환불된 경우 등은 에러가 나더라도 DB 업데이트 진행할지 결정 필요
        // 여기서는 에러를 던져서 중단
        throw new Error(stripeError.message);
      }
    }

    // 2. DB 상태 업데이트 ('refunded')
    const { error } = await supabase
      .from('orders')
      .update({ status: 'refunded' })
      .eq('id', orderId);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}