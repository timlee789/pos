'use client';

import { useState, useEffect } from 'react';
import { getKioskData } from '@/lib/dataFetcher';
import { MenuItem, Category, CartItem, ModifierOption, ModifierGroup } from '@/lib/types';
import PosMenuGrid from '@/components/pos/PosMenuGrid';
import PosCart from '@/components/pos/PosCart';
import CashPaymentModal from '@/components/pos/CashPaymentModal';
import OrderTypeModal from '@/components/OrderTypeModal';
import TableNumberModal from '@/components/TableNumberModal';
import TipModal from '@/components/TipModal';
import ModifierModal from '@/components/ModifierModal';
import DayWarningModal from '@/components/DayWarningModal';

// ✨ [Admin Config] 나중에 DB settings에서 불러오도록 확장 가능
// true로 설정하면 To Go 주문 시에도 번호(페이저/진동벨 번호) 입력을 받습니다.
const ADMIN_CONFIG = {
  enableToGoTableNum: true, 
};

interface TransactionState {
  method: 'CASH' | 'CARD' | null;
  orderType: 'dine_in' | 'to_go' | null;
  tableNum: string | null;
  tipAmount: number;
}

export default function PosPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [modifiersObj, setModifiersObj] = useState<{ [key: string]: ModifierGroup }>({});
  
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);

  // Flow State
  const [isOrderTypeOpen, setIsOrderTypeOpen] = useState(false);
  const [isTableNumOpen, setIsTableNumOpen] = useState(false);
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [selectedItemForMod, setSelectedItemForMod] = useState<MenuItem | null>(null);
  const [showDayWarning, setShowDayWarning] = useState(false);
  const [warningTargetDay, setWarningTargetDay] = useState('');

  const [txn, setTxn] = useState<TransactionState>({
    method: null, orderType: null, tableNum: null, tipAmount: 0,
  });

  // --- Data Load ---
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await getKioskData();
        setCategories(data.categories);
        setMenuItems(data.items);
        setModifiersObj(data.modifiersObj);
        
        // 첫 번째 카테고리 기본 선택
        if (data.categories.length > 0) {
            setSelectedCategory(data.categories[0].id);
        }
      } catch (error) { console.error("Failed to load POS data:", error); } 
      finally { setIsLoading(false); }
    };
    loadData();
  }, []);

  // --- Cart & Logic ---
  const addToCart = (item: MenuItem, modifiers: ModifierOption[] = []) => {
     const optionsPrice = modifiers.reduce((acc, opt) => acc + opt.price, 0);
     const isSpecialSet = item.category === 'Special';
     const currentGroupId = isSpecialSet ? `group-${Date.now()}-${Math.random()}` : undefined;

     const mainCartItem: CartItem = { 
       ...item, 
       selectedModifiers: modifiers, 
       uniqueCartId: Date.now().toString() + Math.random().toString(), 
       quantity: 1, 
       totalPrice: item.price + optionsPrice,
       // @ts-ignore
       groupId: currentGroupId 
     };

     let newItems = [mainCartItem];
     if (isSpecialSet) {
       const desc = item.description?.toLowerCase() || '';
       if (desc.includes('fries') || desc.includes('ff')) {
          const friesItem = menuItems.find(i => i.name === '1/2 FF' || i.name === 'French Fries' || i.posName === '1/2 FF');
          // @ts-ignore
          if (friesItem) newItems.push({ ...friesItem, selectedModifiers: [], totalPrice: 0, quantity: 1, uniqueCartId: Date.now().toString() + Math.random(), name: `(Set) ${friesItem.name}`, groupId: currentGroupId });
       }
       if (desc.includes('drink')) {
          const drinkItem = menuItems.find(i => i.name === 'Soft Drink' || i.posName === 'Soft Drink');
          // @ts-ignore
          if (drinkItem) newItems.push({ ...drinkItem, selectedModifiers: [], totalPrice: 0, quantity: 1, uniqueCartId: Date.now().toString() + Math.random(), name: `(Set) ${drinkItem.name}`, groupId: currentGroupId });
       }
     }
     setCart((prev) => [...prev, ...newItems]);
     setSelectedItemForMod(null);
  };

  const removeFromCart = (uniqueId: string) => {
    setCart(prev => {
        const targetItem = prev.find(item => item.uniqueCartId === uniqueId);
        // @ts-ignore
        if (targetItem && targetItem.groupId) return prev.filter(item => item.groupId !== targetItem.groupId);
        return prev.filter(item => item.uniqueCartId !== uniqueId);
    });
  };

  const getSubtotal = () => cart.reduce((sum, item) => sum + (item.totalPrice * item.quantity), 0);

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
    }
  };

  // --- Payment Handlers ---
  const handlePaymentStart = (method: 'CASH' | 'CARD') => {
    if (cart.length === 0) return alert('Cart is empty.');
    setTxn({ method, orderType: null, tableNum: null, tipAmount: 0 });
    setIsOrderTypeOpen(true);
  };

  // ✨ [수정] 주문 타입 선택 로직
  const handleOrderTypeSelect = (type: 'dine_in' | 'to_go') => {
    setTxn((prev) => ({ ...prev, orderType: type }));
    setIsOrderTypeOpen(false);

    // ✨ Admin 설정이 켜져있거나, Dine In 인 경우 번호 입력창 띄움
    if (type === 'dine_in' || ADMIN_CONFIG.enableToGoTableNum) {
      setIsTableNumOpen(true);
    } else {
      // 번호 입력 없이 바로 팁/결제로 이동
      setTxn((prev) => ({ ...prev, tableNum: null }));
      setIsTipOpen(true);
    }
  };

  const handleTableNumConfirm = (num: string) => {
    setTxn((prev) => ({ ...prev, tableNum: num }));
    setIsTableNumOpen(false);
    setIsTipOpen(true);
  };

  const handleTipSelect = (amt: number) => {
    setTxn((prev) => ({ ...prev, tipAmount: amt }));
    setIsTipOpen(false);

    if (txn.method === 'CASH') {
      setIsCashModalOpen(true);
    } else {
      console.log('Starting Card Transaction...', { ...txn, tipAmount: amt });
      alert(`Card Payment to be implemented.\nTotal: $${(getSubtotal() + amt).toFixed(2)}`);
    }
  };

  const handleCashPaymentConfirm = async (received: number, change: number) => {
    try {
      setIsCashModalOpen(false);
      
      const subtotalVal = getSubtotal();
      const finalTotal = subtotalVal + txn.tipAmount;

      // ✨ [수정] 테이블 번호 표시 로직 (To Go도 번호가 있으면 표시)
      const displayTableNum = txn.tableNum 
        ? (txn.orderType === 'to_go' ? `To Go #${txn.tableNum}` : txn.tableNum)
        : (txn.orderType === 'to_go' ? 'To Go' : '00');

      console.log("=== Processing Cash Payment ===");

      // 1. [DB] Save
      const saveRes = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          subtotal: subtotalVal,
          tax: 0,
          tip: txn.tipAmount,
          total: finalTotal,
          paymentMethod: 'CASH',
          orderType: txn.orderType,
          tableNum: displayTableNum // DB에도 처리된 번호 저장
        })
      });

      const orderResult = await saveRes.json();
      if (!orderResult.success) throw new Error("DB Save Failed: " + orderResult.error);
      
      const newOrderNumber = orderResult.orderNumber; 

      // 2. [Printer]
      try {
         await fetch('http://localhost:4000/print', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: cart,
              orderNumber: newOrderNumber, 
              tableNumber: displayTableNum, // 프린터에도 처리된 번호 전송
              orderType: txn.orderType,
              date: new Date().toLocaleString(),
              subtotal: subtotalVal,
              tax: 0,
              tipAmount: txn.tipAmount,
              totalAmount: finalTotal,
              paymentMethod: 'CASH'
            })
         });
      } catch (e) {
        console.error("Printer Error:", e);
        alert("Order saved, but printing failed.");
      }

      alert(`Order #${newOrderNumber} Complete!\nChange: $${change.toFixed(2)}`);
      
      setCart([]); 
      setTxn({ method: null, orderType: null, tableNum: null, tipAmount: 0 });

    } catch (error) {
      console.error("Payment Error", error);
      alert("An error occurred during payment.");
    }
  };

  const resetFlow = () => {
    setIsOrderTypeOpen(false);
    setIsTableNumOpen(false);
    setIsTipOpen(false);
    setIsCashModalOpen(false);
    setSelectedItemForMod(null);
    setShowDayWarning(false);
  };

  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === categories.find(c => c.id === selectedCategory)?.name);

  if (isLoading) return <div className="flex h-screen items-center justify-center font-bold">Loading...</div>;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      
      <div className="w-1/3 h-full">
        <PosCart 
          cart={cart} 
          subtotal={getSubtotal()} 
          onRemoveItem={removeFromCart} 
          onPaymentStart={handlePaymentStart} 
        />
      </div>

      <div className="flex-1 h-full">
        <PosMenuGrid 
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          filteredItems={filteredItems}
          onItemClick={handleItemClick}
        />
      </div>

      {showDayWarning && <DayWarningModal targetDay={warningTargetDay} onClose={() => setShowDayWarning(false)} />}
      {selectedItemForMod && <ModifierModal item={selectedItemForMod} modifiersObj={modifiersObj} onClose={() => setSelectedItemForMod(null)} onConfirm={addToCart} />}
      {isOrderTypeOpen && <OrderTypeModal onSelect={handleOrderTypeSelect} onCancel={resetFlow} />}
      {isTableNumOpen && <TableNumberModal onConfirm={handleTableNumConfirm} onCancel={resetFlow} />}
      {isTipOpen && <TipModal subtotal={getSubtotal()} onSelectTip={handleTipSelect} />}
      
      <CashPaymentModal 
        isOpen={isCashModalOpen}
        onClose={resetFlow}
        totalAmount={getSubtotal() + txn.tipAmount} 
        onConfirm={handleCashPaymentConfirm}
      />
    </div>
  );
}