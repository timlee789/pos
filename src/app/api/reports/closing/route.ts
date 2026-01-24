import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 프린터 서버 IP 확인 (환경에 맞게 수정 필요)
const PRINTER_SERVER_URL = 'http://192.168.50.106:4000/print-closing';

export async function POST(request: Request) {
  try {
    // targetDate: 'YYYY-MM-DD' 형식의 문자열 (예: '2026-01-24')
    const { employeeName, print, targetDate } = await request.json();

    // 1. 날짜 범위 설정
    // 클라이언트에서 날짜를 보내주면 그 날짜 사용, 아니면 오늘 사용
    const baseDate = targetDate ? new Date(targetDate) : new Date();
    
    // 정확한 범위 검색을 위해 시/분/초 설정 (해당 날짜의 00:00:00 ~ 23:59:59)
    // 주의: 실제 배포 환경의 Timezone에 따라 new Date(string) 동작이 다를 수 있으나, 
    // 로컬 키오스크 환경임을 감안하여 시스템 로컬 시간을 따르도록 설정합니다.
    // (더 정확하게 하려면 'YYYY-MM-DDT00:00:00' 문자열을 직접 만들어 쓰는 것이 좋습니다)
    
    // 안전한 날짜 파싱 (YYYY-MM-DD 문자열을 받아서 로컬 시간 0시/23시로 설정)
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const day = baseDate.getDate();

    // UTC 보정 문제 방지를 위해, 입력받은 날짜 문자열(targetDate)이 있다면 
    // 그것을 그대로 쪼개서 로컬 시간 객체를 만드는 것이 가장 안전합니다.
    let searchStart, searchEnd;

    if (targetDate) {
        // targetDate가 "2026-01-24" 라면
        const [y, m, d] = targetDate.split('-').map(Number);
        searchStart = new Date(y, m - 1, d, 0, 0, 0, 0);
        searchEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
    } else {
        searchStart = new Date();
        searchStart.setHours(0, 0, 0, 0);
        searchEnd = new Date();
        searchEnd.setHours(23, 59, 59, 999);
    }

    // 2. 해당 날짜의 'paid' 주문 조회
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', searchStart.toISOString())
      .lte('created_at', searchEnd.toISOString())
      .eq('status', 'paid');

    if (error) throw error;

    // 3. 합계 계산
    let cashTotal = 0;
    let cardTotal = 0;
    let tipTotal = 0;
    let grandTotal = 0;
    let orderCount = orders.length;

    orders.forEach((order: any) => {
      const total = order.total_amount || 0;
      grandTotal += total;
      tipTotal += order.tip || 0;

      if (order.payment_method === 'CASH') {
        cashTotal += total;
      } else {
        cardTotal += total;
      }
    });

    const reportData = {
      // 리포트에 찍힐 날짜 텍스트
      date: targetDate ? targetDate : new Date().toLocaleDateString(),
      employeeName,
      cashTotal,
      cardTotal,
      tipTotal,
      grandTotal,
      orderCount
    };

    // 4. 인쇄 요청 시 프린터 서버로 전송
    if (print) {
      await fetch(PRINTER_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
    }

    return NextResponse.json({ success: true, data: reportData });

  } catch (error: any) {
    console.error("Report Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}