import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
// ✨ [수정] ExtendedCartItem을 여기서도 import에 추가
import { MenuItem, CartItem, ModifierOption, ExtendedCartItem } from '@/lib/types';

export function useKiosk(categories: any[], items: MenuItem[]) {
  // 상태 관리
  const [activeTab, setActiveTab] = useState<string>('');
  const [cart, setCart] = useState<ExtendedCartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // 모달 상태
  const [showTableModal, setShowTableModal] = useState(false);
  const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showDayWarning, setShowDayWarning] = useState(false);
  const [warningTargetDay, setWarningTargetDay] = useState('');
  
  // 결제 진행 상태
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // 결제 데이터
  const [currentTableNumber, setCurrentTableNumber] = useState<string>('');
  const [selectedOrderType, setSelectedOrderType] = useState<'dine_in' | 'to_go' | null>(null);
  const [selectedTipAmount, setSelectedTipAmount] = useState<number>(0);

  // ✨ [추가] 관리자 설정 값 (테이블 번호 필수 여부)
  const [requireTableNum, setRequireTableNum] = useState(true);

  const cartEndRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. 초기화 및 설정 불러오기
  useEffect(() => {
    if (categories.length > 0) setActiveTab(categories[0].name);
    
    // ✨ DB에서 설정값 가져오기
    const fetchSettings = async () => {
      const { data } = await supabase.from('store_settings').select('is_table_number_required').limit(1).single();
      if (data) setRequireTableNum(data.is_table_number_required);
    };
    fetchSettings();
  }, [categories]);

  // 2. 카트 스크롤
  useEffect(() => {
    if (isCartOpen) cartEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [cart, isCartOpen]);

  // 3. 아이들 타이머 (자동 초기화)
  const resetToHome = () => {
    setCart([]); setCurrentTableNumber(''); setSelectedOrderType(null);
    setIsSuccess(false); setIsProcessing(false); setShowTipModal(false);
    setShowTableModal(false); setShowOrderTypeModal(false); setShowDayWarning(false);
    setIsCartOpen(false);
    if (categories.length > 0) setActiveTab(categories[0].name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const resetIdleTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { if (!isProcessing) resetToHome(); }, 180000);
    };
    window.addEventListener('click', resetIdleTimer);
    window.addEventListener('touchstart', resetIdleTimer);
    window.addEventListener('scroll', resetIdleTimer);
    resetIdleTimer();
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', resetIdleTimer);
      window.removeEventListener('touchstart', resetIdleTimer);
      window.removeEventListener('scroll', resetIdleTimer);
    };
  }, [isProcessing, categories]);

  // 계산 로직
  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0.07;
    const totalWithTax = subtotal + tax;
    const cardFee = totalWithTax * 0.03;
    const grandTotal = totalWithTax + cardFee;
    return { subtotal, tax, cardFee, grandTotal };
  };

  // 장바구니 추가
  const handleAddToCart = (item: MenuItem, selectedOptions: ModifierOption[]) => {
    const totalPrice = item.price + selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
    const isSpecialSet = item.category === 'Special';
    const currentGroupId = isSpecialSet ? `group-${Date.now()}-${Math.random()}` : undefined;

    const mainCartItem: ExtendedCartItem = {
      ...item, selectedModifiers: selectedOptions, totalPrice, quantity: 1,
      uniqueCartId: Date.now().toString() + Math.random().toString(), groupId: currentGroupId,
    };

    let newCartItems = [mainCartItem];
    if (isSpecialSet) {
       // ... (기존 세트 로직 유지) ...
       const desc = item.description?.toLowerCase() || '';
       if (desc.includes('fries') || desc.includes('ff')) {
         const friesItem = items.find(i => i.name === '1/2 FF' || i.name === 'French Fries' || i.posName === '1/2 FF');
         if (friesItem) newCartItems.push({ ...friesItem, selectedModifiers: [], totalPrice: 0, quantity: 1, uniqueCartId: Date.now().toString() + Math.random().toString(), name: `(Set) ${friesItem.name}`, groupId: currentGroupId });
       }
       if (desc.includes('drink')) {
         const drinkItem = items.find(i => i.name === 'Soft Drink' || i.posName === 'Soft Drink');
         if (drinkItem) newCartItems.push({ ...drinkItem, selectedModifiers: [], totalPrice: 0, quantity: 1, uniqueCartId: Date.now().toString() + Math.random().toString(), name: `(Set) ${drinkItem.name}`, groupId: currentGroupId });
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

  // ✨ [Logic] Pay Now 버튼 클릭 시 분기 처리
  const handlePayNowClick = () => {
    if (requireTableNum) {
      setShowTableModal(true);
    } else {
      // 테이블 번호 입력이 필요 없으면 '00'으로 설정하고 바로 다음 단계(Order Type)로 이동
      handleTableNumberConfirm("00");
    }
  };

  const handleTableNumberConfirm = (tableNum: string) => {
    setCurrentTableNumber(tableNum);
    setShowTableModal(false);
    setIsCartOpen(false); // 카트 닫기
    setShowOrderTypeModal(true);
  };

  // 실제 결제 처리
  const processRealPayment = async (finalTipAmount: number) => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    const orderType = selectedOrderType || 'dine_in';
    const tableNum = currentTableNumber || '00';
    try {
      const { subtotal, tax, cardFee, grandTotal } = calculateTotals();
      const finalAmountWithTip = grandTotal + finalTipAmount;

      const stripeRes = await fetch('/api/stripe/process', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: finalAmountWithTip }) });
      if (!stripeRes.ok) throw new Error("Card Payment Failed or Declined.");

      const { data: orderData, error: orderError } = await supabase.from('orders').insert({ total_amount: finalAmountWithTip, status: 'paid', table_number: orderType === 'to_go' ? 'To Go' : tableNum, order_type: orderType }).select().single();
      if (orderError) throw orderError;

      const orderItemsData = cart.map(item => ({ order_id: orderData.id, item_name: item.name, quantity: item.quantity, price: item.totalPrice, options: item.selectedModifiers }));
      await supabase.from('order_items').insert(orderItemsData);

      try { await fetch('/api/clover/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart, totalAmount: finalAmountWithTip, tableNumber: tableNum, orderType: orderType, tipAmount: finalTipAmount }) }); } catch (cloverError) { console.error("Clover Error:", cloverError); }
      try { await fetch('http://127.0.0.1:4000/print', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: "Order #" + tableNum, tableNumber: tableNum.toString(), orderType: orderType, items: cart, subtotal: subtotal, tax: tax, cardFee: cardFee, tipAmount: finalTipAmount, totalAmount: finalAmountWithTip, date: new Date().toLocaleString('en-US') }) }); } catch (printError) { console.error("Printer Error:", printError); }

      setIsProcessing(false); setIsSuccess(true);
      setTimeout(() => resetToHome(), 15000);
    } catch (error: any) {
      setIsProcessing(false); alert("❌ Error: " + error.message);
    }
  };

  return {
    activeTab, setActiveTab, cart, setCart, selectedItem, setSelectedItem, isCartOpen, setIsCartOpen,
    showTableModal, setShowTableModal, showOrderTypeModal, setShowOrderTypeModal, showTipModal, setShowTipModal,
    showDayWarning, setShowDayWarning, warningTargetDay, setWarningTargetDay, isProcessing, isSuccess,
    cartEndRef, calculateTotals, handleAddToCart, removeFromCart, 
    handlePayNowClick, // ✨ 새로 만든 핸들러
    handleTableNumberConfirm, 
    setSelectedOrderType, setSelectedTipAmount, processRealPayment, resetToHome
  };
}