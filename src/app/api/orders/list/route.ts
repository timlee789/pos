import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    // 1. 주문과 주문 아이템들을 같이 가져옴 (최신순 50개)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          menu_item_id,
          item_name,
          price,
          quantity,
          modifiers,
          notes
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ success: true, orders: data });

  } catch (error: any) {
    console.error('Fetch Orders Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}