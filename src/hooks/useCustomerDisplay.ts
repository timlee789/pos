import { useCallback } from 'react';
import { CartItem, ModifierGroup } from '@/lib/types';

export type CustomerViewMode = 
  | 'IDLE' 
  | 'CART' 
  | 'MODIFIER_SELECT' 
  | 'TIPPING' 
  | 'PROCESSING' 
  | 'CARD_PROCESSING' // 카드 결제 처리 중 상태 추가
  | 'PAYMENT_SUCCESS'
  | 'ORDER_TYPE_SELECT'
  | 'TABLE_NUMBER_SELECT';

export function useCustomerDisplay() {
  
  const sendState = useCallback(async (
    mode: CustomerViewMode, 
    cart: CartItem[], 
    total: number, 
    activeItemName?: string,
    availableGroups?: ModifierGroup[]
  ) => {
    try {
        await fetch('/api/display', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, cart, total, activeItemName, availableGroups }),
            cache: 'no-store'
        });
    } catch (e) {
        console.error("Display Sync Error:", e);
    }
  }, []);

  const onTipSelected = useCallback((callback: (amount: number) => void) => {
      const ch = new BroadcastChannel('pos-customer-display');
      const handler = (event: MessageEvent) => {
          if (event.data.type === 'TIP_SELECTED') callback(event.data.payload.amount);
      };
      ch.addEventListener('message', handler);

      const storageHandler = (e: StorageEvent) => {
          if (e.key === 'POS_TIP_SELECTED' && e.newValue) {
              const val = JSON.parse(e.newValue);
              if (val.timestamp > Date.now() - 2000) { // 2초 내 이벤트만
                  callback(val.amount);
              }
          }
      };
      window.addEventListener('storage', storageHandler);

      return () => {
          ch.removeEventListener('message', handler);
          ch.close();
          window.removeEventListener('storage', storageHandler);
      };
  }, []);

  return { sendState, onTipSelected };
}