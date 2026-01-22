import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { MenuItem, CartItem, ModifierOption, Category, ModifierGroup } from '@/lib/types';

// 프린터 서버 주소
const PRINTER_SERVER_URL = 'http://192.168.50.106:4000/print';

interface ExtendedCartItem extends CartItem {
  groupId?: string;
}

export function useKioskLogic(categories: Category[], items: MenuItem[]) {
  // --- State ---
  const [activeTab, setActiveTab] = useState<string>('');
  const [cart, setCart] = useState<ExtendedCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartEndRef = useRef<HTMLDivElement>(null);

  // Modals
  const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showDayWarning, setShowDayWarning] = useState(false);
  
  // Selection & Payment
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [warningTargetDay, setWarningTargetDay] = useState('');
  const [selectedOrderType, setSelectedOrderType] = useState<'dine_in' | 'to_go' | null>(null);
  const [currentTableNumber, setCurrentTableNumber] = useState<string>('');
  
  // Status
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- Effects ---
  useEffect(() => {
    if (categories.length > 0) setActiveTab(categories[0].name);
  }, [categories]);

  useEffect(() => {
    if (isCartOpen) cartEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [cart, isCartOpen]);

  // 자동 초기화 (3분)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const resetIdleTimer = () => {
      clearTimeout(timer);
      if (!isProcessing && cart.length > 0) { 
        timer = setTimeout(() => resetToHome(), 180000); 
      }
    };
    window.addEventListener('click', resetIdleTimer);
    window.addEventListener('touchstart', resetIdleTimer);
    resetIdleTimer();
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', resetIdleTimer);
      window.removeEventListener('touchstart', resetIdleTimer);
    };
  }, [isProcessing, cart.length]);

  // --- Actions ---
  const resetToHome = () => {
    setCart([]);
    setCurrentTableNumber('');
    setSelectedOrderType(null);
    setIsSuccess(false);
    setIsProcessing(false);
    setShowTipModal(false);
    setShowTableModal(false);
    setShowOrderTypeModal(false);
    setShowDayWarning(false);
    setIsCartOpen(false);
    if (categories.length > 0) setActiveTab(categories[0].name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0.07;
    const totalWithTax = subtotal + tax;
    const cardFee = totalWithTax * 0.03;
    const grandTotal = totalWithTax + cardFee;
    return { subtotal, tax, cardFee, grandTotal };
  };

  const addToCart = (item: MenuItem, selectedOptions: ModifierOption[]) => {
    const totalPrice = item.price + selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
    const isSpecialSet = item.category === 'Special';
    const currentGroupId = isSpecialSet ? `group-${Date.now()}-${Math.random()}` : undefined;

    const mainCartItem: ExtendedCartItem = {
      ...item,
      selectedModifiers: selectedOptions,
      totalPrice: totalPrice,
      quantity: 1,
      uniqueCartId: Date.now().toString() + Math.random().toString(),
      groupId: currentGroupId,
    };

    let newCartItems = [mainCartItem];

    if (isSpecialSet) {
      const desc = item.description?.toLowerCase() || '';
      if (desc.includes('fries') || desc.includes('ff')) {
        const friesItem = items.find(i => i.name === '1/2 FF' || i.name === 'French Fries' || i.posName === '1/2 FF');
        if (friesItem) newCartItems.push({ ...friesItem, selectedModifiers: [], totalPrice: 0, quantity: 1, uniqueCartId: Date.now().toString() + Math.random(), name: `(Set) ${friesItem.name}`, groupId: currentGroupId } as any);
      }
      if (desc.includes('drink')) {
        const drinkItem = items.find(i => i.name === 'Soft Drink' || i.posName === 'Soft Drink');
        if (drinkItem) newCartItems.push({ ...drinkItem, selectedModifiers: [], totalPrice: 0, quantity: 1, uniqueCartId: Date.now().toString() + Math.random(), name: `(Set) ${drinkItem.name}`, groupId: currentGroupId } as any);
      }
    }
    setCart(prev => [...prev, ...newCartItems]);
    setSelectedItem(null);
    setIsCartOpen(true);
  };

  const removeFromCart = (uniqueId: string) => {
    setCart(prev => {
      const targetItem = prev.find(item => item.uniqueCartId === uniqueId);
      if (targetItem && targetItem.groupId) return prev.filter(item => item.groupId !== targetItem.groupId);
      return prev.filter(item => item.uniqueCartId !== uniqueId);
    });
  };

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
      setSelectedItem(item);
    }
  };

  // --- ✨ [핵심 수정] Payment Flow Logic ---
  const processRealPayment = async (finalTipAmount: number) => {
    if (cart.length === 0) return;
    setIsProcessing(true); // 화면에 로딩(스피너) 표시 시작
    
    const orderType = selectedOrderType || 'dine_in';
    const tableNumVal = currentTableNumber || '00'; 
    const finalTableStr = orderType === 'to_go' ? `To Go (${tableNumVal})` : tableNumVal;

    try {
      const { subtotal, tax, cardFee, grandTotal } = calculateTotals();
      const finalAmountWithTip = grandTotal + finalTipAmount;

      // 1. Stripe 결제 의도 생성 (Payment Intent) - 리더기에 금액 표시됨
      const stripeRes = await fetch('/api/stripe/process', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ amount: finalAmountWithTip }) 
      });
      const processData = await stripeRes.json();
      
      if (!processData.success) throw new Error(processData.error || "Payment Init Failed");
      const { paymentIntentId } = processData;

      // 2. ✨ [Polling Loop] 결제 완료 대기 (최대 120초)
      // 리더기에서 카드를 꽂고 승인이 날 때까지 여기서 멈춰있어야 함
      let isPaymentConfirmed = false;
      
      for (let i = 0; i < 120; i++) {
         // 1초 대기
         await new Promise(resolve => setTimeout(resolve, 1000));
         
         // 상태 확인 요청
         const checkRes = await fetch('/api/stripe/capture', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ paymentIntentId }),
         });
         const checkData = await checkRes.json();

         if (checkData.status === 'succeeded') {
             isPaymentConfirmed = true;
             break; // 루프 탈출 -> 다음 단계로 진행
         } else if (checkData.status === 'canceled' || checkData.status === 'failed') {
             throw new Error("Card Declined or Canceled.");
         }
         // 'requires_payment_method' 등의 상태면 계속 대기
      }

      if (!isPaymentConfirmed) {
          throw new Error("Payment Timeout. Please try again.");
      }

      // --- 👇 아래 코드는 결제가 'succeeded' 된 후에만 실행됨 👇 ---

      // 3. DB 저장 (Order 생성)
      const { data: orderData, error: orderError } = await supabase.from('orders').insert({ 
        total_amount: finalAmountWithTip, 
        status: 'paid', 
        table_number: finalTableStr, 
        order_type: orderType, 
        // Stripe Payment Intent ID 저장 (나중에 환불시 필요)
        transaction_id: paymentIntentId
      }).select().single();
      
      if (orderError) throw orderError;

      const orderItemsData = cart.map(item => ({ 
        order_id: orderData.id, 
        item_name: item.name, 
        quantity: item.quantity, 
        price: item.totalPrice, 
        options: item.selectedModifiers 
      }));
      await supabase.from('order_items').insert(orderItemsData);

      // 4. 프린터 출력 (주방 + 영수증)
      try { 
        await fetch(PRINTER_SERVER_URL, { 
          method: 'POST', headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
            orderId: "Order #" + tableNumVal, 
            tableNumber: finalTableStr, 
            orderType, 
            items: cart, 
            subtotal, tax, cardFee, tipAmount: finalTipAmount, totalAmount: finalAmountWithTip, 
            date: new Date().toLocaleString('en-US'),
            paymentMethod: "CARD",
            employeeName: "Kiosk",
            // printKitchenOnly: false // false여야 영수증도 나옵니다 (기본값이 false라 가정)
          }) 
        }); 
      } catch (e) { console.error("Printer Error", e); }

      // 5. 성공 화면 표시 및 초기화
      setIsProcessing(false); // 로딩 끝
      setIsSuccess(true);     // 성공 화면(Thank You) 표시
      setTimeout(() => resetToHome(), 10000); // 10초 후 초기화

    } catch (error: any) {
      setIsProcessing(false);
      // 에러 발생 시 잠시 기다렸다가 알림 (UI 렌더링 충돌 방지)
      await new Promise(resolve => setTimeout(resolve, 100));
      alert("❌ Payment Failed: " + error.message);
      
      // 실패 시에도 카트가 비워지지 않게 하려면 아래 줄 삭제, 
      // 하지만 보안상/다음 손님을 위해 비우는 게 좋다면 유지.
      // 여기서는 일단 실패 시 그대로 두어 다시 시도하게 할 수도 있지만,
      // 질문자님 의도(결제 시도 후엔 비우기)에 따라 초기화합니다.
      resetToHome(); 
    }
  };

  return {
    // Data
    activeTab, setActiveTab,
    cart, cartEndRef,
    isCartOpen, setIsCartOpen,
    selectedItem, setSelectedItem,
    
    // Modals Control
    showOrderTypeModal, setShowOrderTypeModal,
    showTableModal, setShowTableModal,
    showTipModal, setShowTipModal,
    showDayWarning, setShowDayWarning,
    
    // Payment Data
    warningTargetDay,
    isProcessing, isSuccess,
    
    // Functions
    addToCart, removeFromCart, handleItemClick,
    setSelectedOrderType,
    setCurrentTableNumber,
    processRealPayment,
    resetToHome,
    calculateTotals
  };
}