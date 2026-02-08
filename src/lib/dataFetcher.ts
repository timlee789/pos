import { createClient } from '@supabase/supabase-js';
import { Category, MenuItem, ModifierGroup } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ✨ [추가됨] 설정값(팁 모드) 가져오기 함수
const fetchStoreSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('enable_on_reader_tipping')
      .limit(1)
      .single();

    if (error) {
      console.warn("Settings fetch warning:", error.message);
      return false; // 에러 나면 기본값(화면 팁 사용)으로
    }
    return data?.enable_on_reader_tipping || false;
  } catch (e) {
    return false;
  }
};

// ✨ 공통: DB 데이터를 우리 앱의 MenuItem 타입으로 변환하는 함수
const mapToMenuItem = (item: any, catName: string, modGroups: string[]): MenuItem => ({
  id: item.id,
  name: item.name,
  posName: item.pos_name,
  price: item.price,
  category: catName,
  description: item.description,
  image: item.image_url || '/placeholder.png',
  modifierGroups: modGroups,
  sort_order: item.sort_order,
  is_available: item.is_available,
  clover_id: item.clover_id
});

// ✨ 공통: 데이터 가져오기 로직 (내부용)
const fetchMenuData = async (isKioskMode: boolean) => {
  // 1. 쿼리 작성
  let query = supabase
    .from('categories')
    .select(`
      id, 
      name,
      sort_order,
      items (
        id, 
        name, 
        pos_name, 
        price, 
        description, 
        image_url, 
        sort_order,
        is_available,
        is_kiosk_visible, 
        is_pos_visible,
        clover_id,  
        item_modifier_groups (
          modifier_groups (
            name,
            modifiers (name, price, sort_order)
          )
        )
      )
    `)
    .order('sort_order', { ascending: true });

  const { data: categoriesData, error } = await query;

  if (error) {
    console.error("❌ DB Fetch Error:", error.message);
    return { categories: [], items: [], modifiersObj: {} };
  }

  const categories: Category[] = [];
  const allItems: MenuItem[] = [];
  const modifiersObj: { [key: string]: ModifierGroup } = {};

  categoriesData.forEach((cat: any) => {
    // ✨ [필터링 핵심] 모드에 따라 아이템 걸러내기
    const rawItems = cat.items || [];
    const filteredItems = rawItems.filter((item: any) => {
      if (isKioskMode) {
        // 키오스크 모드면: is_kiosk_visible이 true인 것만
        return item.is_kiosk_visible !== false; 
      } else {
        // POS 모드면: is_pos_visible이 true인 것만
        return item.is_pos_visible !== false;
      }
    });

    categories.push({ 
      id: cat.id, 
      name: cat.name,
      items: [] 
    });

    // 정렬
    filteredItems.sort((a: any, b: any) => (Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999)));

    filteredItems.forEach((item: any) => {
      const modGroups: string[] = [];

      if (item.item_modifier_groups) {
        item.item_modifier_groups.forEach((relation: any) => {
          const group = relation.modifier_groups;
          if (group) {
            modGroups.push(group.name);
            if (!modifiersObj[group.name]) {
              const sortedModifiers = (group.modifiers || []).sort(
                (a: any, b: any) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)
              );
              modifiersObj[group.name] = {
                name: group.name,
                options: sortedModifiers.map((m: any) => ({ name: m.name, price: m.price }))
              };
            }
          }
        });
      }

      allItems.push(mapToMenuItem(item, cat.name, modGroups));
    });
  });

  return { categories, items: allItems, modifiersObj };
};

// -----------------------------------------------------
// 🚀 외부에서 사용하는 함수들
// -----------------------------------------------------

// 1. 손님용 (키오스크)
export const getKioskData = async () => {
  return await fetchMenuData(true);
};

// 2. 직원용 (POS): ✨ 여기를 수정했습니다!
export const getPosData = async () => {
  // 메뉴 데이터와 설정 데이터를 병렬로 가져옵니다.
  const [menuData, enableReaderTipping] = await Promise.all([
    fetchMenuData(false),
    fetchStoreSettings()
  ]);

  // 기존 메뉴 데이터에 설정값(enableReaderTipping)을 합쳐서 반환
  return {
    ...menuData,
    enableReaderTipping // true면 단말기 팁 사용, false면 화면 팁 사용
  };
};