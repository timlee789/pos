import { useEffect, useRef } from 'react';
import { CartItem, ModifierGroup } from '@/lib/types';

// ✨ PROCESSING 추가 (결제 진행 중 화면용)
export type CustomerViewMode = 'IDLE' | 'CART' | 'MODIFIER_SELECT' | 'TIPPING' | 'PROCESSING' | 'PAYMENT_SUCCESS';

interface CustomerDisplayData {
  type: 'SYNC_STATE';
  payload: {
    mode: CustomerViewMode;
    cart: CartItem[];
    total: number;
    activeItemName?: string; 
    availableGroups?: ModifierGroup[]; 
  };
}

export function useCustomerDisplay() {
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel('pos-customer-display');
    return () => channelRef.current?.close();
  }, []);

  const sendState = (
    mode: CustomerViewMode, 
    cart: CartItem[], 
    total: number, 
    activeItemName?: string,
    availableGroups?: ModifierGroup[] 
  ) => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'SYNC_STATE',
        payload: { mode, cart, total, activeItemName, availableGroups }
      });
    }
  };

  const onTipSelected = (callback: (tipAmount: number) => void) => {
    if (!channelRef.current) return;
    const handler = (event: MessageEvent) => {
      if (event.data.type === 'TIP_SELECTED') {
        callback(event.data.payload.amount);
      }
    };
    channelRef.current.addEventListener('message', handler);
    return () => channelRef.current?.removeEventListener('message', handler);
  };

  return { sendState, onTipSelected };
}