import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { MenuItem, CartItem, ModifierOption, Category, ModifierGroup } from '@/lib/types';

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

  // ✨ 환경 변수
  const PRINTER_SERVER_URL = process.env.NEXT_PUBLIC_PRINTER_SERVER_URL || null;
  const TAX_RATE = parseFloat(process.env.NEXT_PUBLIC_TAX_RATE || '0.07');
  const CARD_FEE_RATE = parseFloat(process.env.NEXT_PUBLIC_CARD_FEE_RATE || '0.03');

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

  // ✨ 카드 수수료 포함 총액 계산
  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * TAX_RATE;
    const cardFee = (subtotal + tax) * CARD_FEE_RATE;
    const grandTotal = subtotal + tax + cardFee;
    
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

  // --- ✨ [최적화됨] POS 스타일 결제 로직 (Polling 루프 없음) ---
  const processRealPayment = async (finalTipAmount: number) => {
    if (cart.length === 0) return;
    setIsProcessing(true); // 로딩 표시
    
    const orderType = selectedOrderType || 'dine_in';
    const tableNumVal = currentTableNumber || '00'; 
    const finalTableStr = orderType === 'to_go' ? `To Go (${tableNumVal})` : tableNumVal;

    try {
      const { subtotal, tax, cardFee, grandTotal } = calculateTotals();
      
      // 최종 결제 금액
      const finalAmountWithTip = grandTotal + finalTipAmount;

      // 1. 선저장 (Order ID 생성)
      const { data: orderData, error: orderError } = await supabase.from('orders').insert({ 
        total_amount: finalAmountWithTip, 
        status: 'processing', 
        table_number: finalTableStr, 
        order_type: orderType, 
        card_fee: cardFee,
        tax: tax,
        tip: finalTipAmount,
        transaction_id: 'pending'
      }).select().single();
      
      if (orderError || !orderData) throw new Error("Order Creation Failed");

      // 주문 아이템 저장
      const orderItemsData = cart.map(item => ({ 
        order_id: orderData.id, 
        item_name: item.name, 
        quantity: item.quantity, 
        price: item.totalPrice, 
        options: item.selectedModifiers 
      }));
      await supabase.from('order_items').insert(orderItemsData);

      // 2. Stripe 결제 요청 (WisePOS E)
      // 여기서 결제가 완료될 때까지 기다립니다 (await) -> 그래서 Polling이 필요 없습니다.
      const stripeRes = await fetch('/api/stripe/process', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
            amount: finalAmountWithTip, 
            source: 'kiosk', 
            orderId: orderData.id, 
            description: `Kiosk Order #${orderData.id}`
        }) 
      });
      
      const processData = await stripeRes.json();
      
      if (!processData.success) {
          await supabase.from('orders').update({ status: 'failed' }).eq('id', orderData.id);
          throw new Error(processData.error || "Payment Failed");
      }

      const { paymentIntentId } = processData;

      // 3. 결제 성공 후처리
      await supabase.from('orders').update({ 
          status: 'paid', 
          transaction_id: paymentIntentId,
          updated_at: new Date().toISOString()
      }).eq('id', orderData.id);

      // 4. ✨ [핵심 추가] 프린터 출력 (source: 'kiosk' 포함)
      if (PRINTER_SERVER_URL) {
          try { 
            await fetch(PRINTER_SERVER_URL, { 
              method: 'POST', headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ 
                // ✨ 이 부분이 있어야 프린터 서버가 IP를 202번으로 잡습니다!
                source: 'kiosk', 
                
                orderId: "Order #" + orderData.order_number, 
                tableNumber: finalTableStr, 
                orderType, 
                items: cart, 
                subtotal, 
                tax, 
                cardFee, 
                tipAmount: finalTipAmount, 
                totalAmount: finalAmountWithTip, 
                date: new Date().toLocaleString('en-US'),
                paymentMethod: "CARD (Kiosk)",
                employeeName: "Kiosk",
                printKitchen: true,
                printReceipt: true
              }) 
            }); 
          } catch (e) { console.error("Printer Error", e); }
      }

      // 5. 성공 화면
      setIsProcessing(false);
      setIsSuccess(true);     
      setTimeout(() => resetToHome(), 10000);

    } catch (error: any) {
      setIsProcessing(false);
      console.error(error);
      alert("❌ Payment Failed: " + error.message);
    }
  };

  return {
    activeTab, setActiveTab, cart, cartEndRef, isCartOpen, setIsCartOpen,
    selectedItem, setSelectedItem, showOrderTypeModal, setShowOrderTypeModal,
    showTableModal, setShowTableModal, showTipModal, setShowTipModal,
    showDayWarning, setShowDayWarning, warningTargetDay, isProcessing, isSuccess,
    addToCart, removeFromCart, handleItemClick, setSelectedOrderType,
    setCurrentTableNumber, processRealPayment, resetToHome, calculateTotals
  };
}