import { useCallback } from 'react';
import { CartItem, ModifierGroup } from '@/lib/types';

export type CustomerViewMode = 
  | 'IDLE' 
  | 'CART' 
  | 'MODIFIER_SELECT' 
  | 'TIPPING' 
  | 'PROCESSING' 
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
        // ✨ [수정] 서버 API로 상태 전송 (Fire and Forget)
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

  // 팁 선택 리스너 (Polling 방식은 팁을 역으로 받기 어려우므로, 팁은 기존 채널 유지 시도)
  // 단, 같은 브라우저가 아니면 안되므로, 팁 선택은 일단 '로컬 스토리지' 이벤트를 활용해 백업합니다.
  const onTipSelected = useCallback((callback: (amount: number) => void) => {
      // 1. BroadcastChannel 시도 (같은 프로필일 경우 대비)
      const ch = new BroadcastChannel('pos-customer-display');
      const handler = (event: MessageEvent) => {
          if (event.data.type === 'TIP_SELECTED') callback(event.data.payload.amount);
      };
      ch.addEventListener('message', handler);

      // 2. Storage Event 시도 (다른 프로필 간 통신 백업)
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