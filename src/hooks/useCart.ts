import { useState } from 'react';
import { MenuItem, CartItem, ModifierOption } from '@/lib/types';

// ✨ [추가] 환경 변수에서 카드 수수료율 가져오기 (기본값 0.03 = 3%)
const CARD_FEE_RATE = parseFloat(process.env.NEXT_PUBLIC_CARD_FEE_RATE || '0.03');

export function useCart(menuItems: MenuItem[]) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingNoteItem, setEditingNoteItem] = useState<CartItem | null>(null);

  const getSubtotal = () => cart.reduce((sum, item) => sum + (item.totalPrice * item.quantity), 0);

  // ✨ [추가] 카드 수수료 계산 함수
  // (Subtotal + Tax) 금액을 넣으면 수수료 금액을 반환합니다.
  const getCardFee = (amountWithTax: number) => {
    return amountWithTax * CARD_FEE_RATE;
  };

  // ✨ [리팩토링] modifiers 타입을 명확히 하고, 로직을 is_special_bundle 플래그 기반으로 변경
  const addToCart = (item: MenuItem, modifiers: ModifierOption[] = []) => {
      
      const optionsPrice = modifiers.reduce((acc, opt) => acc + opt.price, 0);
      const currentGroupId = item.is_special_bundle ? `group-${Date.now()}-${Math.random()}` : undefined;

      const mainCartItem: CartItem = { 
        ...item, 
        selectedModifiers: modifiers,
        uniqueCartId: Date.now().toString() + Math.random().toString(), 
        quantity: 1, 
        totalPrice: item.price + optionsPrice,
        groupId: currentGroupId 
      };

      let newItems: CartItem[] = [mainCartItem];

      // ✨ [리팩토링] Special 메뉴 자동 번들링 로직 개선
      if (item.is_special_bundle) {
        const lowerDesc = (item.description || '').toLowerCase();

        // 참고: 이 로직은 여전히 설명에 의존합니다. 
        // 가장 이상적인 방법은 DB에 "bundle_items": ["ITEM_ID_FRIES", "ITEM_ID_DRINK"] 처럼 명시하는 것입니다.
        // 현재 데이터 구조 상에서는, 이름 대신 "Fries"나 "Drink"같은 키워드로 찾는 것이 최선입니다.
        const includesFries = lowerDesc.includes('fries') || lowerDesc.includes('ff');
        const includesDrink = lowerDesc.includes('drink') || lowerDesc.includes('w/d');

        if (includesFries) {
           // 이름으로 찾는 대신, is_bundle_component_fries: true 와 같은 플래그를 쓰는게 더 안정적입니다.
           const friesItem = menuItems.find(i => i.name.toLowerCase().includes('1/2 ff'));
           if (friesItem) {
               newItems.push({ 
                   ...friesItem, 
                   selectedModifiers: [], 
                   totalPrice: 0, 
                   quantity: 1, 
                   uniqueCartId: Date.now().toString() + '1', 
                   name: `(Set) ${friesItem.name}`,
                   groupId: currentGroupId 
               });
           }
        }
        if (includesDrink) {
           const drinkItem = menuItems.find(i => i.name.toLowerCase() === 'soft drink');
           if (drinkItem) {
               newItems.push({ 
                   ...drinkItem, 
                   selectedModifiers: [], 
                   totalPrice: 0, 
                   quantity: 1, 
                   uniqueCartId: Date.now().toString() + '2', 
                   name: `(Set) ${drinkItem.name}`,
                   groupId: currentGroupId 
               });
           }
        }
      }
      setCart((prev) => [...prev, ...newItems]);
  };

  const removeFromCart = (uniqueId: string) => {
    setCart(prev => {
        const targetItem = prev.find(item => item.uniqueCartId === uniqueId);
        if (targetItem && targetItem.groupId) {
            return prev.filter(item => item.groupId !== targetItem.groupId);
        }
        return prev.filter(item => item.uniqueCartId !== uniqueId);
    });
  };

  const handleSaveNote = (note: string) => {
    if (!editingNoteItem) return;
    setCart(prev => prev.map(item => 
        item.uniqueCartId === editingNoteItem.uniqueCartId ? { ...item, notes: note } : item
    ));
    setEditingNoteItem(null);
  };

  // ✨ getCardFee를 반환 객체에 추가했습니다.
  return { cart, setCart, addToCart, removeFromCart, getSubtotal, getCardFee, editingNoteItem, setEditingNoteItem, handleSaveNote };
}