import { NextResponse } from 'next/server';

// ✨ [핵심] 서버가 재시작되어도 유지되도록 전역 변수(globalThis)에 저장합니다.
// 이렇게 안 하면 Next.js가 가끔 메모리를 비워버려서 "3개 이미지"만 나올 수 있습니다.
const globalStore = globalThis as unknown as { 
  posDisplayState: any 
};

// 초기값 설정
if (!globalStore.posDisplayState) {
  globalStore.posDisplayState = {
    mode: 'IDLE',
    cart: [],
    total: 0,
    activeItemName: '',
    availableGroups: [],
    lastUpdated: Date.now()
  };
}

export async function GET() {
  // 손님 화면이 물어볼 때
  return NextResponse.json(globalStore.posDisplayState);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 상태 업데이트
    globalStore.posDisplayState = {
      ...body,
      lastUpdated: Date.now()
    };

    // 🔍 [디버깅 로그] 터미널에서 이 로그가 찍히는지 확인하세요!
    console.log(`📡 [API] 상태 업데이트됨: ${body.mode} (Total: $${body.total})`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [API] 업데이트 실패:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}