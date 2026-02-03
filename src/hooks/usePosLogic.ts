// src/hooks/usePosLogic.ts
import { useState, useEffect } from 'react';
import { getPosData } from '@/lib/dataFetcher';
import { useCustomerDisplay } from './useCustomerDisplay';
import { useCart } from './useCart';
import { useTransaction } from './useTransaction';
import { MenuItem, Category, ModifierGroup, Employee } from '@/lib/types';

const ADMIN_CONFIG = { enableToGoTableNum: true };

interface TransactionState {
  method: 'CASH' | 'CARD' | null;
  orderType: 'dine_in' | 'to_go' | null;
  tableNum: string | null;
  tipAmount: number;
}

export function usePosLogic() {
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [modifiersObj, setModifiersObj] = useState<{ [key: string]: ModifierGroup }>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);

  const { cart, setCart, addToCart, removeFromCart, getSubtotal, editingNoteItem, setEditingNoteItem, handleSaveNote } = useCart(menuItems);
  
  const { 
      isCardProcessing, setIsCardProcessing, 
      cardStatusMessage, setCardStatusMessage, 
      processOrder, refundOrder, cancelPayment, 
      currentPaymentIntentIdRef, isCancelledRef 
  } = useTransaction();

  const { sendState, onTipSelected } = useCustomerDisplay();

  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [txn, setTxn] = useState<TransactionState>({ method: null, orderType: null, tableNum: null, tipAmount: 0 });
  
  const [isOrderListOpen, setIsOrderListOpen] = useState(false);
  const [isOrderTypeOpen, setIsOrderTypeOpen] = useState(false);
  const [isTableNumOpen, setIsTableNumOpen] = useState(false);
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isPhoneOrderModalOpen, setIsPhoneOrderModalOpen] = useState(false);
  
  const [selectedItemForMod, setSelectedItemForMod] = useState<MenuItem | null>(null);
  const [showDayWarning, setShowDayWarning] = useState(false);
  const [warningTargetDay, setWarningTargetDay] = useState('');

  // Load Initial Data
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

  // Customer Display Sync
  useEffect(() => {
     if (cart.length === 0) {
        sendState('IDLE', [], 0);
     } else {
        if (!isCardProcessing && !isOrderTypeOpen && !isTableNumOpen && !isTipOpen) {
             sendState('CART', cart, getSubtotal());
        }
     }
  }, [cart, isCardProcessing, isOrderTypeOpen, isTableNumOpen, isTipOpen, sendState, getSubtotal]);

  // Handle Item Click
  const handleItemClick = (item: MenuItem) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayIndex = new Date().getDay(); 
    const targetDay = days.find(day => item.name.includes(day));
    
    if (targetDay && targetDay !== days[todayIndex]) {
      setWarningTargetDay(targetDay);
      setShowDayWarning(true); 
      return; 
    }

    if (!item.modifierGroups || item.modifierGroups.length === 0) {
      addToCart(item, []);
    } else {
      setSelectedItemForMod(item);
      const groupsToShow = item.modifierGroups
        .map(groupName => modifiersObj[groupName])
        .filter(group => group !== undefined);
      sendState('MODIFIER_SELECT', cart, getSubtotal(), item.name, groupsToShow);
    }
  };

  const closeModifierModal = () => {
      setSelectedItemForMod(null);
      sendState('CART', cart, getSubtotal());
  };

  const handlePaymentStart = (method: 'CASH' | 'CARD') => {
    if (cart.length === 0) return alert('Cart is empty.');
    
    setTxn(prev => ({ ...prev, method }));
    setIsOrderTypeOpen(true);
    sendState('ORDER_TYPE_SELECT', cart, getSubtotal());
  };

  const handleOrderTypeSelect = (type: 'dine_in' | 'to_go') => {
    setTxn((prev) => ({ ...prev, orderType: type }));
    setIsOrderTypeOpen(false);
    
    if (type === 'dine_in' || ADMIN_CONFIG.enableToGoTableNum) {
        setIsTableNumOpen(true);
        sendState('TABLE_NUMBER_SELECT', cart, getSubtotal());
    } else {
        setTxn((prev) => ({ ...prev, tableNum: '00' }));
        handleFinalStageTrigger();
    }
  };

  const handleTableNumConfirm = (num: string) => {
    setTxn((prev) => ({ ...prev, tableNum: num }));
    setIsTableNumOpen(false);
    handleFinalStageTrigger();
  };

  const handleFinalStageTrigger = () => {
    if (txn.method === 'CASH') {
        setIsCashModalOpen(true);
    } else {
        setIsTipOpen(true);
        sendState('TIPPING', cart, getSubtotal());
    }
  };

  const handleTipSelect = (amt: number) => {
    setTxn((prev) => ({ ...prev, tipAmount: amt }));
    setIsTipOpen(false);
    if (txn.method === 'CASH') {
        setIsCashModalOpen(true);
    } else {
        handleCardPayment(amt);
    }
  };

  const handleCardPayment = async (tip: number) => {
      setIsCardProcessing(true);
      isCancelledRef.current = false;
      
      const subtotal = getSubtotal();
      const ccFee = subtotal * 0.03;
      const totalToPay = subtotal + ccFee + tip;

      const displayTableNum = txn.tableNum ? (txn.orderType === 'to_go' ? `To Go #${txn.tableNum}` : txn.tableNum) : '00';
      
      setCardStatusMessage("Printing Kitchen Ticket...");
      const preSave = await processOrder(cart, subtotal, tip, 'CARD', txn.orderType || 'dine_in', displayTableNum, currentEmployee, null, null, 'processing', 'KITCHEN');

      if (!preSave.success) {
          setIsCardProcessing(false);
          alert(preSave.error);
          return;
      }

      sendState('PROCESSING', cart, subtotal);
      
      try {
          const processRes = await fetch('/api/stripe/process', {
             method: 'POST', headers: { 'Content-Type': 'application/json' }, 
             body: JSON.stringify({ amount: totalToPay, source: 'pos' }),
          });
          const { success, paymentIntentId, error } = await processRes.json();
          if (!success) throw new Error(error);

          currentPaymentIntentIdRef.current = paymentIntentId;
          setCardStatusMessage("💳 Please Insert / Tap Card");

          let isSuccess = false;
          const timeout = Date.now() + 120000;
          while (Date.now() < timeout && !isCancelledRef.current) {
              await new Promise(r => setTimeout(r, 1500));
              const check = await fetch('/api/stripe/capture', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentIntentId }),
              });
              const statusData = await check.json();
              if (statusData.status === 'succeeded') { isSuccess = true; break; }
              if (statusData.status === 'failed' || statusData.status === 'canceled') throw new Error("Payment Failed");
          }

          if (isSuccess) {
              await finalizeTransaction('CARD', paymentIntentId, preSave.orderId);
          }
      } catch (e: any) {
          setIsCardProcessing(false);
          sendState('CART', cart, subtotal);
          alert(e.message);
      }
  };

  const handleCashPaymentConfirm = async (received: number, change: number) => {
      setIsCashModalOpen(false);
      await finalizeTransaction('CASH'); 
  };

  const finalizeTransaction = async (method: 'CASH' | 'CARD', transactionId: string | null = null, existingOrderId: string | null = null) => {
      const displayTableNum = txn.tableNum || '00';
      const result = await processOrder(cart, getSubtotal(), txn.tipAmount, method, txn.orderType || 'dine_in', displayTableNum, currentEmployee, existingOrderId, transactionId, 'paid', 'ALL');

      if (result.success) {
          sendState('PAYMENT_SUCCESS', cart, getSubtotal());
          setIsCardProcessing(false);
          setCart([]);
          setTxn({ method: null, orderType: null, tableNum: null, tipAmount: 0 });
      }
  };

  const handleLogout = () => { setCurrentEmployee(null); setCart([]); };

  return {
    currentEmployee, setCurrentEmployee, cart, categories, menuItems, modifiersObj,
    selectedCategory, setSelectedCategory, isLoading, 
    isOrderListOpen, setIsOrderListOpen, txn,
    isOrderTypeOpen, isTableNumOpen, isTipOpen, isCashModalOpen,
    isPhoneOrderModalOpen, setIsPhoneOrderModalOpen,
    selectedItemForMod, closeModifierModal, 
    editingNoteItem, setEditingNoteItem,
    showDayWarning, setShowDayWarning, warningTargetDay,
    isCardProcessing, cardStatusMessage,
    addToCart, removeFromCart, handleSaveNote, handleItemClick, getSubtotal,
    handlePhoneOrderClick: () => setIsPhoneOrderModalOpen(true),
    handlePhoneOrderConfirm: async (name: string) => {
        setIsPhoneOrderModalOpen(false);
        await processOrder(cart, getSubtotal(), 0, 'PENDING', 'to_go', `To Go: ${name}`, currentEmployee, null, null, 'open', 'KITCHEN');
        setCart([]);
    },
    handleRecallOrder: (order: any) => {
        setIsOrderListOpen(false);
        // ... (Recreation logic from your file)
    },
    handleRefundOrder: async (order: any) => {
        const res = await refundOrder(order.id, order.transaction_id, order.total_amount);
        if (res.success) fetch('/api/orders/list'); // Refresh
    },
    handlePaymentStart, handleOrderTypeSelect, handleTableNumConfirm, handleTipSelect,
    handleCashPaymentConfirm, resetFlow: () => {
        setIsOrderTypeOpen(false); setIsTableNumOpen(false); setIsTipOpen(false); setIsCashModalOpen(false);
        sendState('CART', cart, getSubtotal());
    }, 
    handleLogout,
    handleCancelPayment: cancelPayment 
  };
}