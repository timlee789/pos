import { useState } from 'react';
import { MenuItem, CartItem, ModifierOption } from '@/lib/types';

export function useCart(menuItems: MenuItem[]) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingNoteItem, setEditingNoteItem] = useState<CartItem | null>(null);

  const getSubtotal = () => cart.reduce((sum, item) => sum + (item.totalPrice * item.quantity), 0);

  // ✨ [수정] modifiers 인자를 any로 받되, 로직을 단순화하여 에러 제거
  const addToCart = (item: MenuItem, modifiers: any = []) => {
      
      // 1. 들어온 데이터가 배열인지 확인 (ModifierModal에서 배열로 보냄)
      let safeModifiers: ModifierOption[] = [];

      if (Array.isArray(modifiers)) {
          safeModifiers = modifiers;
      } else {
          // 배열이 아니면 빈 배열 처리 (빨간 줄 에러가 나던 복잡한 객체 변환 로직 삭제)
          console.warn("[addToCart] Modifiers is not an array:", modifiers);
          safeModifiers = [];
      }

      console.log(`[addToCart] Final Modifiers for ${item.name}:`, safeModifiers);

      // 옵션 가격 합계
      const optionsPrice = safeModifiers.reduce((acc, opt) => acc + opt.price, 0);
      
      const isSpecialCategory = item.category === 'Special';
      const currentGroupId = isSpecialCategory ? `group-${Date.now()}-${Math.random()}` : undefined;

      const mainCartItem: CartItem = { 
        ...item, 
        selectedModifiers: safeModifiers, // ✨ 수정된 배열 저장
        uniqueCartId: Date.now().toString() + Math.random().toString(), 
        quantity: 1, 
        totalPrice: item.price + optionsPrice,
        // @ts-ignore
        groupId: currentGroupId 
      };

      let newItems = [mainCartItem];

      // Special 메뉴 자동 번들링 (기존 로직 유지)
      if (isSpecialCategory) {
        const lowerName = item.name.toLowerCase();
        const lowerDesc = (item.description || '').toLowerCase();
        
        if (lowerDesc.includes('fries') || lowerDesc.includes('ff') || lowerName.includes('friday special')) {
           const friesItem = menuItems.find(i => {
               const n = i.name.toLowerCase();
               return n === '1/2 ff' || n === 'french fries' || n.includes('1/2 french');
           });
           if (friesItem) newItems.push({ ...friesItem, selectedModifiers: [], totalPrice: 0, quantity: 1, uniqueCartId: Date.now() + '1', name: `(Set) ${friesItem.name}`, groupId: currentGroupId } as any);
        }
        if (lowerDesc.includes('drink') || lowerDesc.includes('w/d') || lowerName.includes('friday special')) {
           const drinkItem = menuItems.find(i => i.name.toLowerCase() === 'soft drink');
           if (drinkItem) newItems.push({ ...drinkItem, selectedModifiers: [], totalPrice: 0, quantity: 1, uniqueCartId: Date.now() + '2', name: `(Set) ${drinkItem.name}`, groupId: currentGroupId } as any);
        }
      }
      setCart((prev) => [...prev, ...newItems]);
  };

  const removeFromCart = (uniqueId: string) => {
    setCart(prev => {
        const targetItem = prev.find(item => item.uniqueCartId === uniqueId);
        if (targetItem && targetItem.groupId) return prev.filter(item => item.groupId !== targetItem.groupId);
        return prev.filter(item => item.uniqueCartId !== uniqueId);
    });
  };

  const handleSaveNote = (note: string) => {
    if (!editingNoteItem) return;
    setCart(prev => prev.map(item => item.uniqueCartId === editingNoteItem.uniqueCartId ? { ...item, notes: note } : item));
    setEditingNoteItem(null);
  };

  return { cart, setCart, addToCart, removeFromCart, getSubtotal, editingNoteItem, setEditingNoteItem, handleSaveNote };
}