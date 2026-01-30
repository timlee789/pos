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
  const { isCardProcessing, setIsCardProcessing, cardStatusMessage, setCardStatusMessage, processOrder, refundOrder } = useTransaction();
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

  // 1. 초기 데이터 로드
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

  // 2. 손님 화면 연동
  useEffect(() => {
     if (cart.length === 0) {
        sendState('IDLE', [], 0);
     } else {
        if (!isCardProcessing) {
             sendState('CART', cart, getSubtotal());
        }
     }
  }, [cart]);

  // 3. 팁 선택 이벤트
  useEffect(() => {
    const cleanup = onTipSelected((tipAmount) => {
       setTxn(prev => ({ ...prev, tipAmount }));
       setIsTipOpen(false);
       if (txn.method === 'CASH') {
          setIsCashModalOpen(true);
       } else {
          handleCardPayment(tipAmount);
       }
    });
    return cleanup;
  }, [txn.method]); 

  // 4. 아이템 클릭 및 옵션
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
  }

  // 5. 결제 시작 로직
  const handlePaymentStart = (method: 'CASH' | 'CARD') => {
    if (cart.length === 0) return alert('Cart is empty.');
    
    if (currentOrderId && txn.tableNum) {
        setTxn(prev => ({ ...prev, method }));
        if (method === 'CASH') {
            setTxn(prev => ({ ...prev, tipAmount: 0 }));
            setIsCashModalOpen(true);
        } else {
            sendState('TIPPING', cart, getSubtotal());
            setIsTipOpen(true);
        }
    } else {
        setTxn({ method, orderType: null, tableNum: null, tipAmount: 0 });
        setIsOrderTypeOpen(true);
    }
  };

  const handleOrderTypeSelect = (type: 'dine_in' | 'to_go') => {
    setTxn((prev) => ({ ...prev, orderType: type }));
    setIsOrderTypeOpen(false);
    if (type === 'dine_in' || ADMIN_CONFIG.enableToGoTableNum) {
        setIsTableNumOpen(true);
    } else {
        setTxn((prev) => ({ ...prev, tableNum: null }));
        if (txn.method === 'CASH') {
            setIsCashModalOpen(true);
        } else {
            sendState('TIPPING', cart, getSubtotal());
            setIsTipOpen(true);
        }
    }
  };

  const handleTableNumConfirm = (num: string) => {
    setTxn((prev) => ({ ...prev, tableNum: num }));
    setIsTableNumOpen(false);
    if (txn.method === 'CASH') {
        setIsCashModalOpen(true);
    } else {
        sendState('TIPPING', cart, getSubtotal());
        setIsTipOpen(true);
    }
  };

  // 6. 결제 및 인쇄 처리 (핵심)
  const handleTipSelect = (amt: number) => {
    setTxn((prev) => ({ ...prev, tipAmount: amt }));
    setIsTipOpen(false);
    if (txn.method === 'CASH') setIsCashModalOpen(true);
    else handleCardPayment(amt);
  };

  const handleCashPaymentConfirm = async (received: number, change: number) => {
      setIsCashModalOpen(false);
      alert(`Please return change: $${change.toFixed(2)}`);
      await finalizeTransaction('CASH'); 
  };

  // ✨✨ [핵심 수정] 타임아웃 방지 & 인쇄 순서 확실하게 수정
  const handleCardPayment = async (tip: number) => {
      setIsCardProcessing(true);
      
      const subtotal = getSubtotal();
      const ccFee = subtotal * 0.03;
      const totalToPay = subtotal + ccFee + tip;

      // (1) 결제 전: 주방/쉐이크만 인쇄 (영수증 X)
      setCardStatusMessage("Printing Kitchen Ticket...");
      const displayTableNum = txn.tableNum ? (txn.orderType === 'to_go' ? `To Go #${txn.tableNum}` : txn.tableNum) : (txn.orderType === 'to_go' ? 'To Go' : '00');
      
      const preSaveResult = await processOrder(
          cart, subtotal, tip, 'CARD', 
          txn.orderType || 'dine_in', displayTableNum, currentEmployee, 
          currentOrderId, null, 
          'processing', 
          'KITCHEN' // ✨ 주방 프린터만!
      );

      if (!preSaveResult.success || !preSaveResult.orderId) {
          alert("Failed to initialize order: " + preSaveResult.error);
          setIsCardProcessing(false);
          return;
      }

      const activeOrderId = preSaveResult.orderId;
      setCurrentOrderId(activeOrderId);
      sendState('PROCESSING', cart, subtotal);

      try {
          setCardStatusMessage(`Connecting to Terminal... ($${totalToPay.toFixed(2)})`);

          // (2) Stripe 단말기 연결
          const processRes = await fetch('/api/stripe/process', {
             method: 'POST', headers: { 'Content-Type': 'application/json' }, 
             body: JSON.stringify({ amount: totalToPay, source: 'pos' }),
          });
          const { success, paymentIntentId, error } = await processRes.json();
          if (!success) throw new Error(error || "Connection Failed");

          setCardStatusMessage("💳 Please Insert / Tap Card");
          
          let isSuccess = false;
          
          // ✨✨ [핵심] 대기 시간을 300초(5분)로 대폭 연장
          // POS가 단말기보다 먼저 타임아웃 되는 현상을 막습니다.
          for (let i = 0; i < 300; i++) { 
              if (!isCardProcessing) break; 
              await new Promise(r => setTimeout(r, 1000));
              
              const checkRes = await fetch('/api/stripe/capture', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentIntentId }),
              });
              const checkData = await checkRes.json();
              
              if (checkData.status === 'succeeded') { 
                  isSuccess = true; 
                  break; 
              } else if (checkData.status === 'failed' || checkData.status === 'canceled') {
                  throw new Error("Card Declined or Canceled");
              }
              // 그 외 상태(requires_payment_method 등)는 계속 대기
          }
          
          if (isSuccess) {
              // (3) 성공 시: 영수증 인쇄
              await finalizeTransaction('CARD', paymentIntentId, activeOrderId);
          } else {
              throw new Error("Timeout: Payment took too long.");
          }

      } catch (e: any) {
          // (4) 실패 시: 리셋하지 않고 에러 메시지만 표시
          console.error("Payment Failed:", e);
          setCardStatusMessage(`❌ Error: ${e.message}`);
          await new Promise(r => setTimeout(r, 4000)); // 에러 확인 시간 4초
          
          setIsCardProcessing(false); 
          sendState('CART', cart, getSubtotal());
      }
  };
  
  // 거래 완료 및 영수증 인쇄
  const finalizeTransaction = async (method: 'CASH' | 'CARD', transactionId: string | null = null, existingOrderId: string | null = null) => {
      const displayTableNum = txn.tableNum ? (txn.orderType === 'to_go' ? `To Go #${txn.tableNum}` : txn.tableNum) : (txn.orderType === 'to_go' ? 'To Go' : '00');
      const orderIdToUse = existingOrderId || currentOrderId;

      // CARD면 주방은 이미 나왔으니 'RECEIPT'만, CASH면 'ALL'
      const printScope = method === 'CARD' ? 'RECEIPT' : 'ALL';

      const result = await processOrder(
          cart, getSubtotal(), txn.tipAmount, method, 
          txn.orderType || 'dine_in', displayTableNum, currentEmployee, 
          orderIdToUse, transactionId,
          'paid',      
          printScope   // ✨ 인쇄 범위 지정
      );

      if (result.success) {
          if (method === 'CARD') {
              setCardStatusMessage("✅ Payment Complete!");
              await new Promise(r => setTimeout(r, 1000));
              setIsCardProcessing(false);
          }
          sendState('PAYMENT_SUCCESS', cart, getSubtotal());
          setCart([]);
          setTxn({ method: null, orderType: null, tableNum: null, tipAmount: 0 });
          setCurrentOrderId(null);
      } else {
          alert("Error finalizing: " + result.error);
          setIsCardProcessing(false);
      }
  };

  const handlePhoneOrderConfirm = async (customerName: string) => {
      setIsPhoneOrderModalOpen(false);
      const displayTableNum = `To Go: ${customerName}`;
      // 전화 주문은 결제 전이므로 'KITCHEN'만 인쇄
      const result = await processOrder(cart, getSubtotal(), 0, 'PENDING', 'to_go', displayTableNum, currentEmployee, null, null, 'open', 'KITCHEN');
      if (result.success) { alert(`✅ Phone Order Saved!`); setCart([]); }
      else alert("Error: " + result.error);
  };

  const handleRecallOrder = (order: any) => {
    const recreatedCart = order.order_items.map((dbItem: any, idx: number) => ({
        id: dbItem.menu_item_id, name: dbItem.item_name, price: dbItem.price, quantity: dbItem.quantity,
        selectedModifiers: dbItem.modifiers || [], totalPrice: dbItem.price,
        uniqueCartId: `recalled-${order.id}-${idx}`, notes: dbItem.notes || ''
    }));
    setCart(recreatedCart);
    let orderType: 'dine_in' | 'to_go' = 'dine_in';
    if (order.order_type === 'to_go' || order.table_number.toLowerCase().includes('to go')) orderType = 'to_go';
    setTxn({ method: null, orderType: orderType, tableNum: order.table_number, tipAmount: 0 });
    setCurrentOrderId(order.id);
    setIsOrderListOpen(false);
  };

  const handleRefund = async (order: any) => {
      if (!confirm(`Refund Order #${order.order_number}?`)) return;
      const res = await refundOrder(order.id, order.transaction_id, order.total_amount);
      if (res.success) { alert("Refunded"); setIsOrderListOpen(false); }
      else alert("Failed: " + res.error);
  };

  const resetFlow = () => {
    setIsOrderTypeOpen(false); setIsTableNumOpen(false); setIsTipOpen(false); 
    setIsCashModalOpen(false); setSelectedItemForMod(null); setShowDayWarning(false);
  };

  const handleLogout = () => { setCurrentEmployee(null); setCart([]); setCurrentOrderId(null); };

  return {
    currentEmployee, setCurrentEmployee, cart, categories, menuItems, modifiersObj,
    selectedCategory, setSelectedCategory, isLoading, currentOrderId, 
    isOrderListOpen, setIsOrderListOpen, txn,
    isOrderTypeOpen, setIsOrderTypeOpen, isTableNumOpen, setIsTableNumOpen,
    isTipOpen, setIsTipOpen, isCashModalOpen, setIsCashModalOpen,
    isPhoneOrderModalOpen, setIsPhoneOrderModalOpen,
    selectedItemForMod, closeModifierModal, editingNoteItem, setEditingNoteItem,
    showDayWarning, setShowDayWarning, warningTargetDay,
    isCardProcessing, cardStatusMessage,
    addToCart, removeFromCart, handleSaveNote, handleItemClick, getSubtotal,
    handlePhoneOrderClick: () => cart.length ? setIsPhoneOrderModalOpen(true) : alert("Empty"), 
    handlePhoneOrderConfirm,
    handleRecallOrder, handleRefundOrder: handleRefund,
    handlePaymentStart, handleOrderTypeSelect, handleTableNumConfirm, handleTipSelect,
    handleCashPaymentConfirm, resetFlow, handleLogout
  };
}