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
      tableNum,
      employeeName,
      status,
      transactionId 
    } = body;

    console.log(`📝 DB 저장 시작... (Type: ${orderType}, Status: ${status || 'paid'})`);

    // 1. Orders 테이블 저장
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        total_amount: total,
        status: status || 'paid', 
        table_number: tableNum,
        order_type: orderType,
        subtotal: subtotal,
        tax: tax,
        tip: tip,
        payment_method: paymentMethod,
        employee_name: employeeName,
        transaction_id: transactionId 
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
        item_name: item.name || item.posName || 'Unknown Item', 
        price: item.price, 
        quantity: item.quantity,
        modifiers: item.selectedModifiers || [],
        notes: item.notes || null 
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error("❌ Items Insert Error:", itemsError);
        throw itemsError;
      }
    }

    // ✨✨ [핵심 수정] 여기에 orderId를 반드시 포함시켜야 합니다! ✨✨
    return NextResponse.json({ 
      success: true, 
      orderNumber: orderData.order_number,
      orderId: orderData.id, // 👈 이 한 줄이 없어서 에러가 났던 것입니다!
      order: orderData       // (혹시 몰라 전체 데이터도 같이 보냅니다)
    });

  } catch (error: any) {
    console.error('🔥 Order Save API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}