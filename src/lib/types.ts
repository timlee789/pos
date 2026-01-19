// src/lib/types.ts

// 1. 옵션 관련 타입
export interface ModifierOption {
  name: string;
  price: number;
}

export interface ModifierGroup {
  name: string;
  options: ModifierOption[];
}

// 2. 메뉴 아이템
export interface MenuItem {
  id: string;
  name: string;
  posName?: string;
  price: number;
  category: string;
  description?: string;
  image?: string;
  image_url?: string; // 이미지 URL 호환성 추가
  modifierGroups: string[];
  sort_order?: number;
  is_available?: boolean;
  clover_id?: string;
  pos_name?: string;
}

// 3. 카테고리
export interface Category {
  id: string;
  name: string;
  items: MenuItem[];
}

// 4. 장바구니 아이템 (✨ 여기를 수정합니다!)
export interface CartItem extends MenuItem {
  uniqueCartId: string;
  selectedModifiers: ModifierOption[];
  quantity: number;
  totalPrice: number;
  
  // ✨ [수정] notes와 groupId를 여기로 옮기면 모든 에러가 사라집니다.
  // ?가 붙어있으므로 값이 없어도 에러가 나지 않습니다.
  notes?: string;   
  groupId?: string; 
}

// 5. 확장 아이템 (이제 CartItem이 모든 걸 갖고 있으므로 빈 인터페이스여도 됩니다)
// 기존 코드와의 호환성을 위해 남겨두기만 합니다.
export interface ExtendedCartItem extends CartItem {
  // 내용은 CartItem에서 상속받으므로 비워도 됩니다.
}