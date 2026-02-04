// src/hooks/usePosLogic.ts
import { useState, useEffect, useReducer } from 'react';
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
  tipAmount: number;
}

const initialFlowState: PosFlowState = {
  flowStep: 'idle',
  paymentMethod: null,
  orderType: null,
  tableNum: null,
  tipAmount: 0,
};

type FlowAction = 
  | { type: 'START_PAYMENT'; payload: { method: 'CASH' | 'CARD' } }
  | { type: 'SELECT_ORDER_TYPE'; payload: { type: 'dine_in' | 'to_go' } }
  | { type: 'CONFIRM_TABLE_NUM'; payload: { num: string } }
  | { type: 'SELECT_TIP'; payload: { amount: number } }
  | { type: 'CONFIRM_CASH_PAYMENT'; payload: { received: number, change: number } }
  | { type: 'FINALIZE_TRANSACTION' }
  | { type: 'SHOW_PHONE_ORDER_MODAL' }
  | { type: 'SHOW_ORDER_LIST' }
  | { type: 'RESET_FLOW' };

function flowReducer(state: PosFlowState, action: FlowAction): PosFlowState {
  switch (action.type) {
    case 'START_PAYMENT':
      return { ...state, flowStep: 'orderType', paymentMethod: action.payload.method };
    case 'SELECT_ORDER_TYPE':
      const nextStep = action.payload.type === 'dine_in' || ADMIN_CONFIG.enableToGoTableNum ? 'tableNum' : (state.paymentMethod === 'CARD' ? 'tip' : 'cash');
      return { ...state, orderType: action.payload.type, flowStep: nextStep };
    case 'CONFIRM_TABLE_NUM':
      const finalStep = state.paymentMethod === 'CARD' ? 'tip' : 'cash';
      return { ...state, tableNum: action.payload.num, flowStep: finalStep };
    case 'SELECT_TIP':
      return { ...state, tipAmount: action.payload.amount, flowStep: 'card_payment' };
    case 'CONFIRM_CASH_PAYMENT':
      return { ...state, flowStep: 'idle' };
    case 'SHOW_PHONE_ORDER_MODAL':
      return { ...state, flowStep: 'phoneOrder' };
    case 'SHOW_ORDER_LIST':
      return { ...state, flowStep: 'orderList' };
    case 'RESET_FLOW':
      return { ...initialFlowState, paymentMethod: state.paymentMethod };
    case 'FINALIZE_TRANSACTION':
      return initialFlowState;
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
  const [showDayWarning, setShowDayWarning] = useState(false);
  const [warningTargetDay, setWarningTargetDay] = useState('');
  
  const { cart, setCart, addToCart, removeFromCart, getSubtotal, editingNoteItem, setEditingNoteItem, handleSaveNote } = useCart(menuItems);
  const { isCardProcessing, setIsCardProcessing, cardStatusMessage, setCardStatusMessage, processOrder, refundOrder, cancelPayment } = useTransaction();
  const { sendState } = useCustomerDisplay();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
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

  useEffect(() => {
    if (cart.length === 0 && flowState.flowStep === 'idle') {
      sendState('IDLE', [], 0);
      return;
    }
    
    switch (flowState.flowStep) {
        case 'orderType':
            sendState('ORDER_TYPE_SELECT', cart, getSubtotal());
            break;
        case 'tableNum':
            sendState('TABLE_NUMBER_SELECT', cart, getSubtotal());
            break;
        case 'tip':
            sendState('TIPPING', cart, getSubtotal());
            break;
        case 'idle':
             if (!isCardProcessing) sendState('CART', cart, getSubtotal());
             break;
        default:
            break;
    }
  }, [cart, getSubtotal, sendState, flowState.flowStep, isCardProcessing]);

  const finalizeTransaction = async (method: 'CASH' | 'CARD', transactionId: string | null = null, existingOrderId: string | null = null) => {
    const displayTableNum = flowState.tableNum || (flowState.orderType === 'to_go' ? 'To-Go' : 'Dine-In');
    const result = await processOrder(cart, getSubtotal(), flowState.tipAmount, method, flowState.orderType || 'dine_in', displayTableNum, currentEmployee, existingOrderId, transactionId, 'paid', 'ALL');

    if (result.success) {
        sendState('PAYMENT_SUCCESS', [], 0);
        setCart([]);
        dispatch({ type: 'FINALIZE_TRANSACTION' });
    } else {
        setCardStatusMessage(result.error || 'Payment failed. Please check details and try again.');
    }
    setIsCardProcessing(false);
  };

  const handleCardPayment = async () => {
    if (cart.length === 0) {
        alert('Cart is empty.');
        dispatch({ type: 'RESET_FLOW' });
        return;
    }
    setIsCardProcessing(true);
    setCardStatusMessage('Processing card payment...');
    sendState('CARD_PROCESSING', cart, getSubtotal() + flowState.tipAmount);
    
    await finalizeTransaction('CARD');
  };

  useEffect(() => {
    const executeCardPayment = async () => {
      if (flowState.flowStep === 'card_payment') {
        await handleCardPayment();
      }
    };
    executeCardPayment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowState.flowStep]);

  const handleItemClick = (item: MenuItem) => {
    if (item.day_of_week_special) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        if (item.day_of_week_special !== days[new Date().getDay()]) {
            setWarningTargetDay(item.day_of_week_special);
            setShowDayWarning(true);
            return;
        }
    }
    if (!item.modifierGroups || item.modifierGroups.length === 0) {
      addToCart(item, []);
    } else {
      setSelectedItemForMod(item);
      const groupsToShow = item.modifierGroups.map(name => modifiersObj[name]).filter(Boolean);
      sendState('MODIFIER_SELECT', cart, getSubtotal(), item.name, groupsToShow);
    }
  };
  
  const handleTipSelectAndProcessCard = (amount: number) => {
    dispatch({ type: 'SELECT_TIP', payload: { amount } });
  };

  return {
    currentEmployee, setCurrentEmployee, cart, categories, menuItems, modifiersObj,
    selectedCategory, setSelectedCategory, isLoading, 
    flowState, dispatch,
    selectedItemForMod, setSelectedItemForMod, 
    showDayWarning, setShowDayWarning, warningTargetDay,
    closeModifierModal: () => {
        setSelectedItemForMod(null);
        sendState('CART', cart, getSubtotal());
    },
    isCardProcessing, cardStatusMessage,
    addToCart, removeFromCart, handleSaveNote, getSubtotal, editingNoteItem, setEditingNoteItem,
    handleItemClick,
    handlePaymentStart: (method: 'CASH' | 'CARD') => {
        if (cart.length === 0) return alert('Cart is empty.');
        dispatch({ type: 'START_PAYMENT', payload: { method } });
    },
    handleOrderTypeSelect: (type: 'dine_in' | 'to_go') => dispatch({ type: 'SELECT_ORDER_TYPE', payload: { type } }),
    handleTableNumConfirm: (num: string) => dispatch({ type: 'CONFIRM_TABLE_NUM', payload: { num } }),
    handleTipSelectAndProcessCard,
    handleCashPaymentConfirm: async (received: number, change: number) => {
        dispatch({ type: 'CONFIRM_CASH_PAYMENT', payload: { received, change } });
        await finalizeTransaction('CASH');
    },
    handlePhoneOrderConfirm: async (name: string) => {
        await processOrder(cart, getSubtotal(), 0, 'PENDING', 'to_go', `To Go: ${name}`, currentEmployee, null, null, 'open', 'KITCHEN');
        setCart([]);
        dispatch({ type: 'RESET_FLOW' });
    },
    handleRecallOrder: (order: any) => {
        dispatch({ type: 'RESET_FLOW' });
    },
    handleRefundOrder: async (order: any) => {
        const res = await refundOrder(order.id, order.transaction_id, order.total_amount);
        if (res.success) fetch('/api/orders/list');
    },
    handleLogout: () => { 
        setCurrentEmployee(null); 
        setCart([]); 
        dispatch({type: 'FINALIZE_TRANSACTION'}); 
    },
    handleCancelPayment: () => {
        cancelPayment();
        setIsCardProcessing(false);
        dispatch({ type: 'RESET_FLOW' });
    }
  };
}
