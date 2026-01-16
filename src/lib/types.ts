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
  
  // [수정] 기존 코드 호환을 위해 필수(!)값으로 복구
  modifierGroups: string[]; 
  
  sort_order?: number;
  is_available?: boolean;
  clover_id?: string;
  pos_name?: string;   
}

// src/lib/types.ts 파일의 기존 내용 아래에 추가

export interface ExtendedCartItem extends CartItem {
  groupId?: string;
}

// 3. 카테고리
export interface Category {
  id: string;
  name: string;
  items: MenuItem[];
}

// 4. 장바구니 아이템
export interface CartItem extends MenuItem {
  // [수정] 기존 키오스크 코드 변수명으로 복구 (cartId -> uniqueCartId)
  uniqueCartId: string;       
  
  // [수정] 기존 키오스크 코드 변수명으로 복구 (options -> selectedModifiers)
  selectedModifiers: ModifierOption[]; 
  
  quantity: number;
  
  // [수정] 기존 코드 호환을 위해 필수(!)값으로 복구
  totalPrice: number;       
}