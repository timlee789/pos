import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { paymentIntentId } = await request.json();

    // 결제 상태 조회
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // console.log(`🔍 Status Check: ${paymentIntent.status}`); // 로그가 너무 많으면 주석 처리

    // 상태에 따른 응답
    if (paymentIntent.status === 'succeeded') {
      return NextResponse.json({ status: 'succeeded' });
    } else if (paymentIntent.status === 'requires_payment_method') {
      // 아직 카드 입력 대기 중 or 카드 읽는 중
      return NextResponse.json({ status: 'pending' });
    } else if (paymentIntent.status === 'canceled') {
      return NextResponse.json({ status: 'failed', error: 'Payment canceled' });
    } else {
      // 그 외 처리 중 상태
      return NextResponse.json({ status: 'pending' });
    }

  } catch (error: any) {
    console.error("Check Status Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}