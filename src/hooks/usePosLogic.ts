import { useState, useEffect, useReducer, useCallback } from 'react';
import { getPosData } from '@/lib/dataFetcher';
import { useCustomerDisplay } from './useCustomerDisplay';
import { useCart } from './useCart';
import { useTransaction } from './useTransaction';
import { MenuItem, Category, ModifierGroup, Employee } from '@/lib/types';

const ADMIN_CONFIG = { enableToGoTableNum: true };
const TAX_RATE = parseFloat(process.env.NEXT_PUBLIC_TAX_RATE || '0.07');
// ✨ [추가] 카드 수수료율 가져오기 (기본값 3%)
const CARD_FEE_RATE = parseFloat(process.env.NEXT_PUBLIC_CARD_FEE_RATE || '0.03');

interface PosFlowState {
  flowStep: 'idle' | 'orderType' | 'tableNum' | 'tip' | 'cash' | 'phoneOrder' | 'orderList' | 'card_payment';
  paymentMethod: 'CASH' | 'CARD' | null;
  orderType: 'dine_in' | 'to_go' | null;
  tableNum: string | null;
  tipAmount: number | null;
  enableReaderTipping: boolean; 
}

const initialFlowState: PosFlowState = {
  flowStep: 'idle',
  paymentMethod: null,
  orderType: null,
  tableNum: null,
  tipAmount: null,
  enableReaderTipping: false,
};

type FlowAction = 
  | { type: 'START_PAYMENT'; payload: { method: 'CASH' | 'CARD' } }
  | { type: 'SELECT_ORDER_TYPE'; payload: { type: 'dine_in' | 'to_go' } }
  | { type: 'CONFIRM_TABLE_NUM'; payload: { num: string } }
  | { type: 'SELECT_TIP'; payload: { amount: number } }
  | { type: 'START_CARD_PAYMENT' }
  | { type: 'FINALIZE_TRANSACTION' }
  | { type: 'RESET_FLOW' }
  | { type: 'SHOW_PHONE_ORDER_MODAL' } 
  | { type: 'SHOW_ORDER_LIST' }
  | { type: 'SET_CONFIG'; payload: { enableReaderTipping: boolean } };

function flowReducer(state: PosFlowState, action: FlowAction): PosFlowState {
  switch (action.type) {
    case 'SET_CONFIG':
        return { ...state, enableReaderTipping: action.payload.enableReaderTipping };
    case 'START_PAYMENT':
      return { ...state, paymentMethod: action.payload.method, flowStep: 'orderType' };
    case 'SELECT_ORDER_TYPE':
      let nextStepAfterType: PosFlowState['flowStep'];
      if (action.payload.type === 'dine_in' || ADMIN_CONFIG.enableToGoTableNum) {
          nextStepAfterType = 'tableNum';
      } else {
          if (state.paymentMethod === 'CARD') {
              nextStepAfterType = state.enableReaderTipping ? 'card_payment' : 'tip';
          } else {
              nextStepAfterType = 'cash';
          }
      }
      return { ...state, orderType: action.payload.type, flowStep: nextStepAfterType };
    case 'CONFIRM_TABLE_NUM':
      let nextStepAfterTable: PosFlowState['flowStep'];
      if (state.paymentMethod === 'CARD') {
          nextStepAfterTable = state.enableReaderTipping ? 'card_payment' : 'tip';
      } else {
          nextStepAfterTable = 'cash';
      }
      return { ...state, tableNum: action.payload.num, flowStep: nextStepAfterTable };
    case 'SELECT_TIP':
      return { ...state, tipAmount: action.payload.amount };
    case 'START_CARD_PAYMENT':
      return { ...state, flowStep: 'card_payment' };
    case 'FINALIZE_TRANSACTION':
      return { ...initialFlowState, enableReaderTipping: state.enableReaderTipping };
    case 'RESET_FLOW':
      return { ...initialFlowState, orderType: state.orderType, tableNum: state.tableNum, enableReaderTipping: state.enableReaderTipping };
    case 'SHOW_PHONE_ORDER_MODAL':
        return { ...state, flowStep: 'phoneOrder' };
    case 'SHOW_ORDER_LIST':
        return { ...state, flowStep: 'orderList' };
    default:
      return state;
  }
}

export function usePosLogic() {
  const [flowState, dispatch] = useReducer(flowReducer, initialFlowState);
  
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [modifiersObj, setModifiersObj] = useState<{ [key: string]: ModifierGroup }>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItemForMod, setSelectedItemForMod] = useState<MenuItem | null>(null);
  
  const { cart, setCart, addToCart, removeFromCart, getSubtotal, editingNoteItem, setEditingNoteItem, handleSaveNote } = useCart(menuItems);
  const { isCardProcessing, setIsCardProcessing, cardStatusMessage, setCardStatusMessage, processOrder, ...transactionActions } = useTransaction();
  const { sendState } = useCustomerDisplay();

  useEffect(() => {
    if (flowState.flowStep === 'tip' && flowState.tipAmount !== null) {
      dispatch({ type: 'START_CARD_PAYMENT' });
    }
  }, [flowState.tipAmount, flowState.flowStep]);

  useEffect(() => {
    if (flowState.flowStep === 'card_payment') {
      processCardPayment();
    }
  }, [flowState.flowStep]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TIP_SELECTED' && typeof event.data.payload.amount === 'number') {
        dispatch({ type: 'SELECT_TIP', payload: { amount: event.data.payload.amount } });
      }
    };
    const channel = new BroadcastChannel('pos-customer-display');
    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, []);

  // 손님 화면 전송 로직
  useEffect(() => {
    const subtotal = getSubtotal();
    const taxAmount = subtotal * TAX_RATE;
    
    // ✨ [수정] 카드 수수료 계산 (화면 표시용)
    const cardFee = (subtotal + taxAmount) * CARD_FEE_RATE;

    if (selectedItemForMod) {
      const groupsToShow = selectedItemForMod.modifierGroups.map(name => modifiersObj[name]).filter(Boolean);
      sendState('MODIFIER_SELECT', cart, subtotal, selectedItemForMod.name, groupsToShow);
    } else if (flowState.flowStep === 'orderType') {
      sendState('ORDER_TYPE_SELECT', cart, subtotal);
    } else if (flowState.flowStep === 'tableNum') {
      sendState('TABLE_NUMBER_SELECT', cart, subtotal);
    } else if (flowState.flowStep === 'tip') {
      sendState('TIPPING', cart, subtotal + taxAmount);
    } else if (flowState.flowStep === 'card_payment') {
      // ✨ [수정] 결제 진행 중 화면에 '수수료 포함 총액' 표시
      // (팁이 아직 0원이라도 수수료는 포함해서 보여줍니다)
      const total = subtotal + taxAmount + cardFee + (flowState.tipAmount || 0);
      sendState('PROCESSING', cart, total);
    } else if (cart.length > 0) {
      sendState('CART', cart, subtotal);
    } else {
      sendState('IDLE', [], 0);
    }
  }, [cart, getSubtotal, flowState, selectedItemForMod, modifiersObj, sendState]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data: any = await getPosData();
        setCategories(data.categories);
        setMenuItems(data.items);
        setModifiersObj(data.modifiersObj);
        
        dispatch({ 
            type: 'SET_CONFIG', 
            payload: { enableReaderTipping: !!data.enableReaderTipping } 
        });

        if (data.categories.length > 0) setSelectedCategory(data.categories[0].id);
      } catch (error) { console.error("Failed to load POS data:", error); } 
      finally { setIsLoading(false); }
    };
    loadData();
  }, []);

  // ✨ [핵심 수정] 카드 수수료 로직이 추가된 결제 처리 함수
  const processCardPayment = useCallback(async () => {
    let finalTipAmount = flowState.tipAmount ?? 0; 
    const subtotal = getSubtotal();
    if (cart.length === 0) return;

    const taxAmount = subtotal * TAX_RATE;
    
    // ✨ [추가] 카드 수수료 계산
    // (Subtotal + Tax) * 3%
    const cardFee = (subtotal + taxAmount) * CARD_FEE_RATE;

    // ✨ [수정] 초기 결제 요청 금액: 음식 + 세금 + 수수료 + (초기 팁)
    const initialTotal = subtotal + taxAmount + cardFee + finalTipAmount;

    setIsCardProcessing(true);

    setCardStatusMessage('1. Sending order to kitchen...');
    // processOrder 호출 시에는 수수료를 직접 넘기지 않아도 됩니다. (useTransaction 내부에서 계산함)
    // 단, 팁이나 총액이 맞는지 확인은 필요합니다. useTransaction이 잘 처리할 것입니다.
    const kitchenResult = await processOrder(cart, subtotal, finalTipAmount, 'CARD', flowState.orderType || 'dine_in', flowState.tableNum || 'N/A', currentEmployee, null, null, 'processing', 'KITCHEN');

    if (!kitchenResult.success || !kitchenResult.orderId) {
      setCardStatusMessage(`Error: Failed to send to kitchen. ${kitchenResult.error || ''}`);
      setTimeout(() => { setIsCardProcessing(false); dispatch({ type: 'RESET_FLOW' }); }, 4000);
      return;
    }

    setCardStatusMessage('2. Waiting for card payment (Check Reader)...');
    
    // Stripe 결제 요청 (수수료 포함된 금액 전송)
    const stripeResult: any = await transactionActions.processStripePayment(
        initialTotal, // ✨ 수수료가 포함된 금액입니다.
        'pos', 
        kitchenResult.orderId, 
        `Order #${kitchenResult.orderId} - Table ${flowState.tableNum || 'N/A'}`
    );

    if (!stripeResult.success || !stripeResult.paymentIntentId) {
      setCardStatusMessage(`Error: Card payment failed. ${stripeResult.error || ''}`);
      setTimeout(() => { setIsCardProcessing(false); dispatch({ type: 'RESET_FLOW' }); }, 4000);
      return;
    }

    // ✨ [수정] 팁 역계산 로직 (수수료 고려)
    if (stripeResult.amountReceived) {
        const totalCharged = stripeResult.amountReceived / 100; // 달러로 변환
        
        // 예상 금액 = 음식 + 세금 + 수수료 + (이미 입력된 팁)
        const expectedTotal = subtotal + taxAmount + cardFee + (flowState.tipAmount ?? 0);
        
        if (totalCharged > expectedTotal + 0.01) { 
            // 차액을 '추가 팁'으로 간주
            // totalCharged = (Sub + Tax + Fee + OldTip) + NewTip
            // 따라서 NewTip = totalCharged - (Sub + Tax + Fee)
            finalTipAmount = totalCharged - (subtotal + taxAmount + cardFee);
            console.log(`💰 Reader Tip Detected: $${finalTipAmount.toFixed(2)}`);
        }
    }

    setCardStatusMessage('3. Finalizing and printing receipt...');
    
    // 최종 저장 (DB와 영수증에 팁 업데이트)
    const finalResult = await processOrder(
        cart, 
        subtotal, 
        finalTipAmount, 
        'CARD', 
        flowState.orderType || 'dine_in', 
        flowState.tableNum || 'N/A', 
        currentEmployee, 
        kitchenResult.orderId, 
        stripeResult.paymentIntentId, 
        'paid', 
        'RECEIPT'
    );

    if (finalResult.success) {
      setCardStatusMessage(`Payment successful! (Tip: $${finalTipAmount.toFixed(2)})`);
      sendState('PAYMENT_SUCCESS', [], 0);
      setTimeout(() => {
        setCart([]);
        dispatch({ type: 'FINALIZE_TRANSACTION' });
        setIsCardProcessing(false);
      }, 2000);
    } else {
      setCardStatusMessage('Payment successful! Finalizing via system...');
      setTimeout(() => {
        setCart([]);
        dispatch({ type: 'FINALIZE_TRANSACTION' });
        setIsCardProcessing(false);
      }, 2000);
    }
  }, [cart, getSubtotal, flowState, currentEmployee, processOrder, transactionActions, sendState, setCart]);

  // ... (나머지 핸들러 함수들은 기존과 동일) ...
  const handlePhoneOrderConfirm = async (customerName: string) => {
    const result = await processOrder(cart, getSubtotal(), 0, 'PENDING', 'to_go', `To Go: ${customerName}`, currentEmployee, null, null, 'open', 'KITCHEN');
    if (result.success) {
      setCart([]);
      dispatch({ type: 'FINALIZE_TRANSACTION' });
    }
  };

  const handleRecallOrder = (order: any) => { dispatch({ type: 'RESET_FLOW' }); };
  const handleRefundOrder = async (order: any) => { await transactionActions.refundOrder(order.id, order.transaction_id, order.total_amount); };
  const handleLogout = () => { setCurrentEmployee(null); setCart([]); dispatch({ type: 'FINALIZE_TRANSACTION' }); };

  return {
    currentEmployee, setCurrentEmployee, cart, categories, menuItems, modifiersObj,
    selectedCategory, setSelectedCategory, isLoading, 
    flowState, dispatch,
    selectedItemForMod, setSelectedItemForMod, 
    closeModifierModal: () => setSelectedItemForMod(null),
    isCardProcessing, cardStatusMessage,
    addToCart, removeFromCart, getSubtotal, editingNoteItem, setEditingNoteItem, handleSaveNote,
    handleItemClick: (item: MenuItem) => {
        if (item.modifierGroups && item.modifierGroups.length > 0) {
          setSelectedItemForMod(item);
        } else {
          addToCart(item, []);
        }
    },
    handleCashPaymentConfirm: async () => {
        const result = await processOrder(cart, getSubtotal(), 0, 'CASH', flowState.orderType || 'dine_in', flowState.tableNum || 'N/A', currentEmployee, null, null, 'paid', 'ALL');
        if(result.success) {
            sendState('PAYMENT_SUCCESS', [], 0);
            setCart([]);
            dispatch({ type: 'FINALIZE_TRANSACTION' });
        }
    },
    handleCancelPayment: () => {
        transactionActions.cancelPayment();
        dispatch({ type: 'RESET_FLOW' });
    },
    handleTipSelectAndProcessCard: (amount: number) => {
      dispatch({ type: 'SELECT_TIP', payload: { amount } });
    },
    handlePhoneOrderConfirm,
    handleRecallOrder,
    handleRefundOrder,
    handleLogout
  };
}