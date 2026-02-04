'use client';

import { CartItem, ModifierGroup } from '@/lib/types';

export type CustomerViewMode = 
  | 'IDLE' 
  | 'CART' 
  | 'TIPPING'
  | 'PROCESSING' 
  | 'PAYMENT_SUCCESS' 
  | 'MODIFIER_SELECT'
  | 'ORDER_TYPE_SELECT'
  | 'TABLE_NUMBER_SELECT';

export function useCustomerDisplay() {
  
  const sendState = async (
    mode: CustomerViewMode,
    cart: CartItem[],
    total: number,
    activeItemName?: string,
    availableGroups?: ModifierGroup[] // This parameter was missing in the fetch body
  ) => {
    try {
      await fetch('/api/display', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          cart,
          total,
          activeItemName: activeItemName || '',
          availableGroups: availableGroups || [], // Ensure it's always an array
        }),
      });
    } catch (error) {
      console.error("Failed to update customer display:", error);
    }
  };

  return { sendState };
}