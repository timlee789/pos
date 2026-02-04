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
      // Store the tip and wait for the useEffect to trigger the payment process
      return { ...state, tipAmount: action.payload.amount };
    case 'START_CARD_PAYMENT':
      return { ...state, flowStep: 'card_payment' };
    case 'FINALIZE_TRANSACTION':
      return initialFlowState;
    case 'RESET_FLOW':
      return { ...initialFlowState, orderType: state.orderType, tableNum: state.tableNum };
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

  // Main payment flow trigger
  useEffect(() => {
    // When a tip amount is selected (including 0 for 'No Tip'), move to the payment step.
    if (flowState.flowStep === 'tip' && flowState.tipAmount !== null) {
      dispatch({ type: 'START_CARD_PAYMENT' });
    }
  }, [flowState.tipAmount, flowState.flowStep]);

  // Run the actual payment process when the state is 'card_payment'
  useEffect(() => {
    if (flowState.flowStep === 'card_payment') {
      processCardPayment();
    }
  }, [flowState.flowStep]);

  // Listen for tip selection from the customer display
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

  // Sync state with customer display
  useEffect(() => {
    const subtotal = getSubtotal();
    if (selectedItemForMod) {
      const groupsToShow = selectedItemForMod.modifierGroups.map(name => modifiersObj[name]).filter(Boolean);
      sendState('MODIFIER_SELECT', cart, subtotal, selectedItemForMod.name, groupsToShow);
    } else if (flowState.flowStep === 'orderType') {
      sendState('ORDER_TYPE_SELECT', cart, subtotal);
    } else if (flowState.flowStep === 'tableNum') {
      sendState('TABLE_NUMBER_SELECT', cart, subtotal);
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

  // Load initial POS data
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

  // Redesigned Card Payment Process
  const processCardPayment = useCallback(async () => {
    const tip = flowState.tipAmount ?? 0;
    const subtotal = getSubtotal();
    if (cart.length === 0) return;

    setIsCardProcessing(true);

    // --- STEP 1: Create Order & Print to KITCHEN ---
    setCardStatusMessage('1. Sending order to kitchen...');
    const kitchenResult = await processOrder(cart, subtotal, tip, 'CARD', flowState.orderType || 'dine_in', flowState.tableNum || 'N/A', currentEmployee, null, null, 'processing', 'KITCHEN');

    if (!kitchenResult.success || !kitchenResult.orderId) {
      setCardStatusMessage(`Error: Failed to send to kitchen. ${kitchenResult.error || ''}`);
      setTimeout(() => { setIsCardProcessing(false); dispatch({ type: 'RESET_FLOW' }); }, 4000);
      return;
    }

    // --- STEP 2: Process Stripe Payment ---
    setCardStatusMessage('2. Waiting for card payment...');
    const stripeResult = await transactionActions.processStripePayment(subtotal + tip, 'pos', kitchenResult.orderId);

    if (!stripeResult.success || !stripeResult.paymentIntentId) {
      setCardStatusMessage(`Error: Card payment failed. ${stripeResult.error || ''}`);
      setTimeout(() => { setIsCardProcessing(false); dispatch({ type: 'RESET_FLOW' }); }, 4000);
      return;
    }

    // --- STEP 3: Finalize Order & Print RECEIPT ---
    setCardStatusMessage('3. Finalizing and printing receipt...');
    const finalResult = await processOrder(cart, subtotal, tip, 'CARD', flowState.orderType || 'dine_in', flowState.tableNum || 'N/A', currentEmployee, kitchenResult.orderId, stripeResult.paymentIntentId, 'paid', 'RECEIPT');

    if (finalResult.success) {
      setCardStatusMessage('Payment successful!');
      sendState('PAYMENT_SUCCESS', [], 0);
      setTimeout(() => {
        setCart([]);
        dispatch({ type: 'FINALIZE_TRANSACTION' });
        setIsCardProcessing(false);
      }, 2000);
    } else {
      setCardStatusMessage('CRITICAL ERROR: Payment succeeded but failed to update order.');
    }
  }, [cart, getSubtotal, flowState, currentEmployee, processOrder, transactionActions, sendState, setCart]);

  // Other handlers
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
