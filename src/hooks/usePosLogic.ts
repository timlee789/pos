import { useState, useEffect, useReducer, useCallback } from 'react';
import { getPosData } from '@/lib/dataFetcher';
import { useCustomerDisplay } from './useCustomerDisplay';
import { useCart } from './useCart';
import { useTransaction } from './useTransaction';
import { MenuItem, Category, ModifierGroup, Employee } from '@/lib/types';

const ADMIN_CONFIG = { enableToGoTableNum: true };

interface PosFlowState {
  flowStep: 'idle' | 'orderType' | 'tableNum' | 'tip' | 'cash' | 'phoneOrder' | 'orderList' | 'card_payment';
  paymentMethod: 'CASH' | 'CARD' | null;
  orderType: 'dine_in' | 'to_go' | null;
  tableNum: string | null;
  tipAmount: number | null;
}

const initialFlowState: PosFlowState = {
  flowStep: 'idle',
  paymentMethod: null,
  orderType: null,
  tableNum: null,
  tipAmount: null,
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
  | { type: 'SHOW_ORDER_LIST' };

function flowReducer(state: PosFlowState, action: FlowAction): PosFlowState {
  switch (action.type) {
    case 'START_PAYMENT':
      return { ...state, paymentMethod: action.payload.method, flowStep: 'orderType' };
    case 'SELECT_ORDER_TYPE':
      const nextStep = action.payload.type === 'dine_in' || ADMIN_CONFIG.enableToGoTableNum ? 'tableNum' : (state.paymentMethod === 'CARD' ? 'tip' : 'cash');
      return { ...state, orderType: action.payload.type, flowStep: nextStep };
    case 'CONFIRM_TABLE_NUM':
      return { ...state, tableNum: action.payload.num, flowStep: state.paymentMethod === 'CARD' ? 'tip' : 'cash' };
    case 'SELECT_TIP':
      return { ...state, tipAmount: action.payload.amount };
    case 'START_CARD_PAYMENT':
      return { ...state, flowStep: 'card_payment' };
    case 'FINALIZE_TRANSACTION':
      return initialFlowState;
    case 'RESET_FLOW':
      return { ...initialFlowState, paymentMethod: state.paymentMethod };
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

  useEffect(() => {
    const subtotal = getSubtotal();
    if (selectedItemForMod) {
      const groupsToShow = selectedItemForMod.modifierGroups.map(name => modifiersObj[name]).filter(Boolean);
      sendState('MODIFIER_SELECT', cart, subtotal, selectedItemForMod.name, groupsToShow);
    } else if (flowState.flowStep === 'tip') {
      sendState('TIPPING', cart, subtotal);
    } else if (flowState.flowStep === 'card_payment') {
      const total = subtotal + (flowState.tipAmount || 0);
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
        const data = await getPosData();
        setCategories(data.categories);
        setMenuItems(data.items);
        setModifiersObj(data.modifiersObj);
        if (data.categories.length > 0) setSelectedCategory(data.categories[0].id);
      } catch (error) { console.error("Failed to load POS data:", error); } 
      finally { setIsLoading(false); }
    };
    loadData();
  }, []);

  const processCardPayment = useCallback(async () => {
    const tip = flowState.tipAmount ?? 0;
    const subtotal = getSubtotal();
    if (cart.length === 0) return;

    setIsCardProcessing(true);
    setCardStatusMessage('1. Creating order and printing to kitchen...');

    const kitchenResult = await processOrder(cart, subtotal, tip, 'CARD', flowState.orderType || 'dine_in', flowState.tableNum || 'N/A', currentEmployee, null, null, 'processing', 'KITCHEN');

    if (!kitchenResult.success || !kitchenResult.orderId) {
      setCardStatusMessage(kitchenResult.error || 'Kitchen step failed.');
      setTimeout(() => { dispatch({ type: 'RESET_FLOW' }); setIsCardProcessing(false); }, 3000);
      return;
    }

    setCardStatusMessage('2. Processing card payment...');
    const stripeResult = await transactionActions.processStripePayment(subtotal + tip, 'pos', kitchenResult.orderId);

    if (!stripeResult.success || !stripeResult.paymentIntentId) {
      setCardStatusMessage(stripeResult.error || 'Card payment failed.');
      setTimeout(() => { dispatch({ type: 'RESET_FLOW' }); setIsCardProcessing(false); }, 3000);
      return;
    }

    setCardStatusMessage('3. Finalizing and printing receipt...');
    const finalResult = await processOrder(cart, subtotal, tip, 'CARD', flowState.orderType || 'dine_in', flowState.tableNum || 'N/A', currentEmployee, kitchenResult.orderId, stripeResult.paymentIntentId, 'paid', 'RECEIPT');

    if (finalResult.success) {
      sendState('PAYMENT_SUCCESS', [], 0);
      setCart([]);
      dispatch({ type: 'FINALIZE_TRANSACTION' });
    } else {
      setCardStatusMessage('Critical: Failed to save final order status. Check logs.');
    }
    
    setIsCardProcessing(false);

  }, [cart, getSubtotal, flowState, currentEmployee, processOrder, transactionActions, sendState, setCart]);

  const handlePhoneOrderConfirm = async (customerName: string) => {
    const result = await processOrder(cart, getSubtotal(), 0, 'PENDING', 'to_go', `To Go: ${customerName}`, currentEmployee, null, null, 'open', 'KITCHEN');
    if (result.success) {
      setCart([]);
      dispatch({ type: 'FINALIZE_TRANSACTION' });
    }
  };

  const handleRecallOrder = (order: any) => {
      console.log("Recalling order:", order);
      dispatch({ type: 'RESET_FLOW' });
  };

  const handleRefundOrder = async (order: any) => {
      if (!order.transaction_id) return alert("This order cannot be refunded automatically.");
      const res = await transactionActions.refundOrder(order.id, order.transaction_id, order.total_amount);
      if (res.success) alert("Refund successful.");
      else alert(`Refund failed: ${res.error}`);
  };

  const handleLogout = () => {
    setCurrentEmployee(null);
    setCart([]);
    dispatch({ type: 'FINALIZE_TRANSACTION' });
  };

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
    handlePaymentStart: (method: 'CASH' | 'CARD') => {
        if (cart.length > 0) dispatch({ type: 'START_PAYMENT', payload: { method } });
    },
    handleOrderTypeSelect: (type: 'dine_in' | 'to_go') => dispatch({ type: 'SELECT_ORDER_TYPE', payload: { type } }),
    handleTableNumConfirm: (num: string) => dispatch({ type: 'CONFIRM_TABLE_NUM', payload: { num } }),
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
    handlePhoneOrderConfirm,
    handleRecallOrder,
    handleRefundOrder,
    handleLogout
  };
}