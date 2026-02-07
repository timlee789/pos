import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// 1. Stripe 초기화
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
 
});

// 2. Supabase Admin 클라이언트 생성
// ⚠️ 꼭 .env.local에 SUPABASE_SERVICE_ROLE_KEY가 있어야 합니다!
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  // 3. 보안 검증
  try {
    if (!signature || !webhookSecret) {
      return new NextResponse('Webhook Error: Missing signature/secret', { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Webhook Signature Verification Failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 4. 이벤트 처리
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // 메타데이터에서 orderId (UUID) 꺼내기
        const orderId = paymentIntent.metadata.orderId; 

        console.log(`💰 Payment Succeeded: ${paymentIntent.id}, Order UUID: ${orderId}`);

        if (orderId) {
            // ✨ [Supabase DB 업데이트]
            // 사진에 있는 컬럼명(transaction_id, updated_at)을 정확히 사용했습니다.
            const { error } = await supabaseAdmin
              .from('orders') // ⚠️ 테이블 이름이 'orders'인지 'order'인지 꼭 확인하세요!
              .update({ 
                status: 'paid',                   // 결제 상태 변경
                transaction_id: paymentIntent.id, // 사진 속 'transaction_id' 컬럼에 저장
                updated_at: new Date().toISOString() // 사진 속 'updated_at' 업데이트
              })
              .eq('id', orderId); // 사진 속 'id' (UUID)와 일치하는 행 찾기

            if (error) {
              console.error(`❌ Supabase Update Failed for Order ${orderId}:`, error.message);
            } else {
              console.log(`✅ Supabase: Order ${orderId} successfully updated to PAID.`);
            }
        } else {
            console.warn('⚠️ Payment succeeded but no Order ID found in metadata.');
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error(`❌ Payment Failed: ${paymentIntent.last_payment_error?.message}`);
        break;
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook handler failed:', error);
    return new NextResponse('Webhook handler failed', { status: 500 });
  }
}