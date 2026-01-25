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

  // -------------------------------------------------------
  // 1. 초기 데이터 로드
  // -------------------------------------------------------
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

  // -------------------------------------------------------
  // 2. 손님 화면 연동 (Cart 상태)
  // -------------------------------------------------------
  useEffect(() => {
     if (cart.length === 0) {
        sendState('IDLE', [], 0);
     } else {
        sendState('CART', cart, getSubtotal());
     }
  }, [cart]);

  // -------------------------------------------------------
  // 3. ✨ [수정] 손님 팁 선택 이벤트 리스너
  // -------------------------------------------------------
  useEffect(() => {
    const cleanup = onTipSelected((tipAmount) => {
       // 1. 팁 금액 업데이트
       setTxn(prev => ({ ...prev, tipAmount }));
       
       // 2. ✨ [중요] 캐셔 화면의 Tip 모달을 강제로 닫아줍니다.
       setIsTipOpen(false);

       // 3. 결제 진행
       if (txn.method === 'CASH') {
          // 사실 Cash는 팁 단계를 건너뛰게 만들었으므로 여기로 올 일은 거의 없지만 안전장치로 둡니다.
          setIsCashModalOpen(true);
       } else {
          handleCardPayment(tipAmount);
       }
    });
    return cleanup;
  }, [txn.method]); 

  // -------------------------------------------------------
  // 4. 아이템 클릭 및 옵션 전송
  // -------------------------------------------------------
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
      
      // 손님 화면에 옵션 리스트 전송
      sendState('MODIFIER_SELECT', cart, getSubtotal(), item.name, groupsToShow);
    }
  };

  const closeModifierModal = () => {
      setSelectedItemForMod(null);
      sendState('CART', cart, getSubtotal());
  }

  // -------------------------------------------------------
  // 5. ✨ [수정] 결제 흐름 (Cash Tip 건너뛰기 적용)
  // -------------------------------------------------------
  
  // (A) 결제 시작 버튼 클릭
  const handlePaymentStart = (method: 'CASH' | 'CARD') => {
    if (cart.length === 0) return alert('Cart is empty.');
    
    // 이미 주문 정보가 있는 경우 (Recall Order)
    if (currentOrderId && txn.tableNum) {
        setTxn(prev => ({ ...prev, method }));
        
        if (method === 'CASH') {
            // ✨ Cash면 팁 선택 없이 바로 현금 결제창으로
            setTxn(prev => ({ ...prev, tipAmount: 0 }));
            setIsCashModalOpen(true);
        } else {
            // Card면 팁 선택창 띄우기
            sendState('TIPPING', cart, getSubtotal());
            setIsTipOpen(true);
        }
    } else {
        // 새 주문이면 Order Type 선택부터
        setTxn({ method, orderType: null, tableNum: null, tipAmount: 0 });
        setIsOrderTypeOpen(true);
    }
  };

  // (B) Dine-in / To-go 선택
  const handleOrderTypeSelect = (type: 'dine_in' | 'to_go') => {
    setTxn((prev) => ({ ...prev, orderType: type }));
    setIsOrderTypeOpen(false);

    // 테이블 번호가 필요한 경우
    if (type === 'dine_in' || ADMIN_CONFIG.enableToGoTableNum) {
        setIsTableNumOpen(true);
    } else {
        // 테이블 번호 필요 없으면 바로 결제/팁 단계로
        setTxn((prev) => ({ ...prev, tableNum: null }));
        
        if (txn.method === 'CASH') {
            // ✨ Cash면 바로 현금 결제창
            setIsCashModalOpen(true);
        } else {
            // Card면 팁 선택창
            sendState('TIPPING', cart, getSubtotal());
            setIsTipOpen(true);
        }
    }
  };

  // (C) 테이블 번호 입력 완료
  const handleTableNumConfirm = (num: string) => {
    setTxn((prev) => ({ ...prev, tableNum: num }));
    setIsTableNumOpen(false);
    
    if (txn.method === 'CASH') {
        // ✨ Cash면 바로 현금 결제창
        setIsCashModalOpen(true);
    } else {
        // Card면 팁 선택창
        sendState('TIPPING', cart, getSubtotal());
        setIsTipOpen(true);
    }
  };

  // -------------------------------------------------------
  // 6. 결제 처리 및 나머지 로직
  // -------------------------------------------------------

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

  const handleCardPayment = async (tip: number) => {
      // 1. [시작] UI 상태 변경
      setIsCardProcessing(true);
      setCardStatusMessage("Initializing Payment...");
      
      const subtotal = getSubtotal();
      const ccFee = subtotal * 0.03;
      const totalToPay = subtotal + ccFee + tip;

      // 손님 화면: 카드 투입 요청
      sendState('PROCESSING', cart, subtotal);

      try {
          setCardStatusMessage(`Connecting... ($${totalToPay.toFixed(2)})`);

          // 2. Stripe 결제 프로세스
          const processRes = await fetch('/api/stripe/process', {
             method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: totalToPay }),
          });
          const { success, paymentIntentId, error } = await processRes.json();
          if (!success) throw new Error(error || "Connection Failed");

          setCardStatusMessage("💳 Please Insert / Tap Card");
          let isSuccess = false;
          
          // 대기 루프 (120초)
          for (let i = 0; i < 120; i++) {
              if (!isCardProcessing) break; 
              await new Promise(r => setTimeout(r, 1000));
              const checkRes = await fetch('/api/stripe/capture', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentIntentId }),
              });
              const checkData = await checkRes.json();
              if (checkData.status === 'succeeded') { isSuccess = true; break; }
              else if (checkData.status === 'failed') throw new Error("Card Declined");
          }
          
          if (isSuccess) {
              // ✅ 성공 시: DB 저장 + 영수증 출력 + 화면 리셋 (finalizeTransaction 내부에서 처리됨)
              await finalizeTransaction('CARD', paymentIntentId);
          } else {
              throw new Error("Timeout");
          }

      } catch (e: any) {
          // 🛑 실패 시: DB 저장 안 함! 화면만 리셋.
          console.error("Payment Failed:", e);
          
          // 1) 에러 메시지 3초간 표시
          setCardStatusMessage(`❌ Error: ${e.message}`);
          await new Promise(r => setTimeout(r, 3000));
          
          // 2) 화면 리셋 (DB 저장은 하지 않음)
          setIsCardProcessing(false);     // POS 오버레이 끄기
          setCart([]);                    // POS 카트 비우기 (기본 화면으로 리셋)
          setTxn({ method: null, orderType: null, tableNum: null, tipAmount: 0 }); // 거래 상태 초기화
          setCurrentOrderId(null);
          
          // 3) 손님 화면: IDLE 모드(광고)로 복귀
          // (카트가 비워지면 useEffect에 의해 자동으로 IDLE로 가지만, 확실하게 보내줍니다)
          sendState('IDLE', [], 0);
      }
  };
  
  const finalizeTransaction = async (method: 'CASH' | 'CARD', transactionId: string | null = null) => {
      const displayTableNum = txn.tableNum ? (txn.orderType === 'to_go' ? `To Go #${txn.tableNum}` : txn.tableNum) : (txn.orderType === 'to_go' ? 'To Go' : '00');
      const result = await processOrder(
          cart, getSubtotal(), txn.tipAmount, method, 
          txn.orderType || 'dine_in', displayTableNum, currentEmployee, 
          currentOrderId, transactionId
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
          alert("Error: " + result.error);
          setIsCardProcessing(false);
      }
  };

  const handlePhoneOrderConfirm = async (customerName: string) => {
      setIsPhoneOrderModalOpen(false);
      const displayTableNum = `To Go: ${customerName}`;
      const result = await processOrder(cart, getSubtotal(), 0, 'PENDING', 'to_go', displayTableNum, currentEmployee);
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