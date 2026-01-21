import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, paymentMethod, tip, total } = body;

    // 기존 주문 상태를 'paid'로 변경하고 결제 정보 업데이트
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_method: paymentMethod,
        tip: tip,
        total_amount: total, // 팁 포함된 최종 금액 업데이트
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, order: data });

  } catch (error: any) {
    console.error('Update Order Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}