// src/app/kiosk/page.tsx
import { getKioskData } from '@/lib/dataFetcher';
import KioskClient from '@/components/kiosk/KioskClient';

// 매번 최신 데이터를 가져오도록 설정 (품절/가격 변경 즉시 반영)
export const revalidate = 0;

export default async function Page() {
  // 서버에서 데이터 미리 가져오기 (Loading 없음!)
  const { categories, items, modifiersObj } = await getKioskData();

  return (
    <main className="h-screen w-screen overflow-hidden bg-black">
      <KioskClient
        initialCategories={categories}
        initialItems={items}
        initialModifiers={modifiersObj}
      />
    </main>
  );
}