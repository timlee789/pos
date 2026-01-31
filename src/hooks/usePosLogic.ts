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
  
  // ✨ cancelPayment, ref들 가져오기
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

  // 6. 결제 및 인쇄 처리
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

  // ✨✨ [카드 결제 로직 수정] 타임아웃 해결 + 취소 기능 연동
  // ✨✨ [카드 결제 로직 수정] 타이밍 문제 해결 (취소 예약 & 확인 사살)
  const handleCardPayment = async (tip: number) => {
      setIsCardProcessing(true);
      isCancelledRef.current = false; // 취소 깃발 초기화
      currentPaymentIntentIdRef.current = null; // ID 초기화

      const subtotal = getSubtotal();
      const ccFee = subtotal * 0.03;
      const totalToPay = subtotal + ccFee + tip;

      setCardStatusMessage("Printing Kitchen Ticket...");
      const displayTableNum = txn.tableNum ? (txn.orderType === 'to_go' ? `To Go #${txn.tableNum}` : txn.tableNum) : (txn.orderType === 'to_go' ? 'To Go' : '00');
      
      // 1. 주방 프린터 (이건 금방 됨)
      const preSaveResult = await processOrder(
          cart, subtotal, tip, 'CARD', 
          txn.orderType || 'dine_in', displayTableNum, currentEmployee, 
          currentOrderId, null, 'processing', 'KITCHEN' 
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
          // 🚨 [중요] 연결 전에 취소했는지 1차 체크
          if (isCancelledRef.current) throw new Error("Cancelled by User");

          setCardStatusMessage(`Connecting to Terminal... ($${totalToPay.toFixed(2)})`);

          // 2. Stripe 단말기 연결 요청 (여기서 1~2초 걸림)
          const processRes = await fetch('/api/stripe/process', {
             method: 'POST', headers: { 'Content-Type': 'application/json' }, 
             body: JSON.stringify({ amount: totalToPay, source: 'pos' }),
          });
          const { success, paymentIntentId, error } = await processRes.json();
          
          if (!success) throw new Error(error || "Connection Failed");

          // ✨ ID 저장 (이제 취소 가능해짐)
          currentPaymentIntentIdRef.current = paymentIntentId;

          // 🚨 [핵심 해결책 1] 연결 기다리는 동안 취소 버튼을 눌렀다면?
          // ID를 받자마자 즉시 취소를 실행해버립니다.
          if (isCancelledRef.current) {
              console.log("⚠️ 연결 중 취소 감지! 즉시 종료 시도...");
              await cancelPayment(); // 1타 (즉시 취소)
              
              // 🚨 [핵심 해결책 2] 단말기가 늦게 켜질 수 있으니 1.5초 뒤에 "확인 사살"
              setTimeout(() => {
                  console.log("🔫 확인 사살: 취소 명령 재전송");
                  cancelPayment(); 
              }, 1500);
              
              throw new Error("Cancelled by User (Late)");
          }

          setCardStatusMessage("💳 Please Insert / Tap Card");
          
          // 3. 무한 대기 루프 (5분)
          const maxTime = Date.now() + 300 * 1000; 
          let isSuccess = false;

          while (Date.now() < maxTime) {
              // (A) 취소 체크
              if (isCancelledRef.current) {
                  // 혹시 루프 돌다가 취소했는데 단말기가 안 꺼지면 여기서도 확인 사살
                  await cancelPayment(); 
                  throw new Error("Payment Cancelled by User");
              }

              try {
                  await new Promise(r => setTimeout(r, 1000));
                  const checkRes = await fetch('/api/stripe/capture', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentIntentId }),
                  });
                  const checkData = await checkRes.json();

                  if (checkData.status === 'succeeded') { 
                      isSuccess = true; 
                      break; 
                  } else if (checkData.status === 'canceled') {
                      throw new Error("Payment Canceled on Terminal");
                  } else if (checkData.status === 'failed') {
                      throw new Error("Card Declined");
                  }
              } catch (networkErr) {
                  console.warn("Polling glitch (ignored):", networkErr);
              }
          }
          
          if (isSuccess) {
              await finalizeTransaction('CARD', paymentIntentId, activeOrderId);
          } else {
              if (!isCancelledRef.current) throw new Error("Timeout: No payment detected.");
          }

      } catch (e: any) {
          console.error("Payment Failed:", e);
          
          if (e.message.includes("Cancelled") || e.message.includes("User")) {
              setCardStatusMessage("Transaction Cancelled.");
              // 에러가 나서 끝날 때도 혹시 모르니 취소 명령 한 번 더 보냄 (안전 제일)
              if (currentPaymentIntentIdRef.current) cancelPayment();
          } else {
              setCardStatusMessage(`❌ Error: ${e.message}`);
          }

          await new Promise(r => setTimeout(r, 2000)); 
          setIsCardProcessing(false); 
          sendState('CART', cart, getSubtotal());
      }
  };
  
  const finalizeTransaction = async (method: 'CASH' | 'CARD', transactionId: string | null = null, existingOrderId: string | null = null) => {
      const displayTableNum = txn.tableNum ? (txn.orderType === 'to_go' ? `To Go #${txn.tableNum}` : txn.tableNum) : (txn.orderType === 'to_go' ? 'To Go' : '00');
      const orderIdToUse = existingOrderId || currentOrderId;
      const printScope = method === 'CARD' ? 'RECEIPT' : 'ALL';

      const result = await processOrder(
          cart, getSubtotal(), txn.tipAmount, method, 
          txn.orderType || 'dine_in', displayTableNum, currentEmployee, 
          orderIdToUse, transactionId,
          'paid',      
          printScope
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
      const result = await processOrder(cart, getSubtotal(), 0, 'PENDING', 'to_go', displayTableNum, currentEmployee, null, null, 'open', 'KITCHEN');
      if (result.success) { alert(`✅ Phone Order Saved!`); setCart([]); } else { alert("Error: " + result.error); }
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
    handleCashPaymentConfirm, resetFlow, handleLogout,
    
    // ✨ 취소 함수 내보내기 (UI에서 이 버튼을 만들어야 합니다!)
    handleCancelPayment: cancelPayment 
  };
}