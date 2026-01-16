import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      items, 
      subtotal, 
      tax, 
      tip, 
      total, 
      paymentMethod, 
      orderType, 
      tableNum 
    } = body;

    console.log("📝 DB 저장 시작...");

    // 1. Orders 테이블 저장
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        total_amount: total,
        status: 'paid',
        table_number: tableNum,
        order_type: orderType,
        subtotal: subtotal,
        tax: tax,
        tip: tip,
        payment_method: paymentMethod
      })
      .select()
      .single();

    if (orderError) {
      console.error("❌ Orders Insert Error:", orderError);
      throw orderError;
    }

    console.log(`✅ 주문 생성 완료: #${orderData.order_number}`);

    // 2. Order Items 저장
    if (items && items.length > 0) {
      const orderItems = items.map((item: any) => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        
        // ✨ [수정됨] DB 컬럼명 'item_name'에 맞춤 (기존: name)
        item_name: item.posName || item.name || 'Unknown Item', 
        
        // ✨ [참고] 만약 다음 에러가 'price' 관련이면 여기를 'item_price'로 바꿔야 할 수도 있습니다.
        // 현재는 에러 메시지가 없으므로 기존 'price' 유지
        price: item.price, 
        
        quantity: item.quantity,
        modifiers: item.selectedModifiers || [] 
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error("❌ Items Insert Error:", itemsError);
        throw itemsError;
      }
    }

    return NextResponse.json({ 
      success: true, 
      orderNumber: orderData.order_number 
    });

  } catch (error: any) {
    console.error('🔥 Order Save API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}