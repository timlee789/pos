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
      // ✨ [추가] 프론트엔드에서 보낸 직원 이름 받기
      employeeName 
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
        payment_method: paymentMethod,
        // ✨ [추가] 직원 이름 DB에 저장 (컬럼명: employee_name)
        employee_name: employeeName 
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
        
        // DB 컬럼명 'item_name'에 맞춤
        item_name: item.posName || item.name || 'Unknown Item', 
        
        price: item.price, 
        quantity: item.quantity,
        modifiers: item.selectedModifiers || [],
        
        // ✨ [추가] 아이템별 메모(Note) DB에 저장
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

    return NextResponse.json({ 
      success: true, 
      orderNumber: orderData.order_number 
    });

  } catch (error: any) {
    console.error('🔥 Order Save API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}