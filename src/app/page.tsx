// src/app/page.tsx
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
import EmployeeLogin from '@/components/pos/EmployeeLogin';
import SpecialRequestModal from '@/components/pos/SpecialRequestModal';

const ADMIN_CONFIG = {
  enableToGoTableNum: true, 
};

interface TransactionState {
  method: 'CASH' | 'CARD' | null;
  orderType: 'dine_in' | 'to_go' | null;
  tableNum: string | null;
  tipAmount: number;
}

interface Employee {
  id: number;
  name: string;
  role: string;
}

export default function Page() {
  // --- States ---
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [modifiersObj, setModifiersObj] = useState<{ [key: string]: ModifierGroup }>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);

  // Flow Modals
  const [isOrderTypeOpen, setIsOrderTypeOpen] = useState(false);
  const [isTableNumOpen, setIsTableNumOpen] = useState(false);
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [selectedItemForMod, setSelectedItemForMod] = useState<MenuItem | null>(null);
  const [showDayWarning, setShowDayWarning] = useState(false);
  const [warningTargetDay, setWarningTargetDay] = useState('');
  const [editingNoteItem, setEditingNoteItem] = useState<CartItem | null>(null);

  // 카드 결제 진행 상태 (로딩 모달용)
  const [isCardProcessing, setIsCardProcessing] = useState(false);
  const [cardStatusMessage, setCardStatusMessage] = useState('');

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
        if (data.categories.length > 0) setSelectedCategory(data.categories[0].id);
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

  const handleSaveNote = (note: string) => {
    if (!editingNoteItem) return;
    setCart(prev => prev.map(item => item.uniqueCartId === editingNoteItem.uniqueCartId ? { ...item, notes: note } : item));
    setEditingNoteItem(null);
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

  const handleOrderTypeSelect = (type: 'dine_in' | 'to_go') => {
    setTxn((prev) => ({ ...prev, orderType: type }));
    setIsOrderTypeOpen(false);
    if (type === 'dine_in' || ADMIN_CONFIG.enableToGoTableNum) setIsTableNumOpen(true);
    else {
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
      // 바로 카드 결제 프로세스 시작
      handleCardPayment(amt);
    }
  };

  // 통합 결제 처리 함수 (DB 저장 -> 프린트 -> 초기화)
  const finalizeTransaction = async (paymentMethod: 'CASH' | 'CARD') => {
    try {
        const subtotalVal = getSubtotal();
        const finalTotal = subtotalVal + txn.tipAmount;
        const displayTableNum = txn.tableNum 
            ? (txn.orderType === 'to_go' ? `To Go #${txn.tableNum}` : txn.tableNum)
            : (txn.orderType === 'to_go' ? 'To Go' : '00');

        console.log("=== Finalizing Transaction ===");

        // 1. DB Save
        const saveRes = await fetch('/api/orders/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: cart,
                subtotal: subtotalVal,
                tax: 0,
                tip: txn.tipAmount,
                total: finalTotal,
                paymentMethod: paymentMethod,
                orderType: txn.orderType,
                tableNum: displayTableNum,
                employeeName: currentEmployee?.name || 'Unknown' 
            })
        });

        const orderResult = await saveRes.json();
        if (!orderResult.success) throw new Error("DB Save Failed: " + orderResult.error);
        const newOrderNumber = orderResult.orderNumber;

        // 2. Printer Server Call
        try {
            await fetch('http://localhost:4000/print', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart,
                    orderNumber: newOrderNumber, 
                    tableNumber: displayTableNum,
                    orderType: txn.orderType,
                    date: new Date().toLocaleString(),
                    subtotal: subtotalVal,
                    tax: 0,
                    tipAmount: txn.tipAmount,
                    totalAmount: finalTotal,
                    paymentMethod: paymentMethod,
                    employeeName: currentEmployee?.name || 'Unknown' 
                })
            });
        } catch (e) {
            console.error("Printer Error:", e);
            alert("Order saved, but printing failed. Is Printer Server running?");
        }

        // 3. Finish
        if (paymentMethod === 'CARD') {
            setCardStatusMessage("✅ Payment Complete!");
            await new Promise(r => setTimeout(r, 1000));
            setIsCardProcessing(false);
        } else {
            alert(`Order #${newOrderNumber} Complete!`);
        }

        setCart([]); 
        setTxn({ method: null, orderType: null, tableNum: null, tipAmount: 0 });
        
    } catch (error: any) {
        console.error("Finalize Error", error);
        alert("Transaction Error: " + error.message);
        setIsCardProcessing(false);
    }
  };

  const handleCashPaymentConfirm = (received: number, change: number) => {
      setIsCashModalOpen(false);
      alert(`Please return change: $${change.toFixed(2)}`);
      finalizeTransaction('CASH');
  };

  // 카드 결제 로직 (Stripe API 호출 및 Polling)
  const handleCardPayment = async (currentTip: number) => {
      setIsCardProcessing(true);
      setCardStatusMessage("Connecting to Reader...");
      
      try {
        const totalToPay = getSubtotal() + currentTip;

        // 1. 결제 시작 (Process)
        const processRes = await fetch('/api/stripe/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: totalToPay }),
        });
        const processData = await processRes.json();
        
        if (!processData.success) throw new Error(processData.error);
        
        const { paymentIntentId } = processData;
        setCardStatusMessage("💳 Please Tap or Insert Card");

        // 2. 상태 확인 루프 (Polling) - 2분간 확인
        let isSuccess = false;
        for (let i = 0; i < 120; i++) {
            if (!isCardProcessing) break; 

            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const checkRes = await fetch('/api/stripe/capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentIntentId }),
            });
            const checkData = await checkRes.json();

            if (checkData.status === 'succeeded') {
                isSuccess = true;
                break;
            } else if (checkData.status === 'failed') {
                throw new Error("Payment Failed / Canceled");
            }
        }

        if (isSuccess) {
            setCardStatusMessage("Processing Order...");
            await finalizeTransaction('CARD');
        } else {
            throw new Error("Payment Timeout. Please try again.");
        }

      } catch (error: any) {
          console.error(error);
          alert("Card Payment Error: " + error.message);
          setIsCardProcessing(false);
      }
  };

  const resetFlow = () => {
    setIsOrderTypeOpen(false); setIsTableNumOpen(false); setIsTipOpen(false); 
    setIsCashModalOpen(false); setSelectedItemForMod(null); setShowDayWarning(false);
  };
  const handleLogout = () => { setCurrentEmployee(null); setCart([]); };

  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === categories.find(c => c.id === selectedCategory)?.name);

  // 로그인 컴포넌트 호출
  if (!currentEmployee) return <EmployeeLogin onLoginSuccess={setCurrentEmployee} />;
  
  // 로딩
  if (isLoading) return <div className="flex h-screen items-center justify-center font-bold">Loading POS Data...</div>;

  return (
    <div className="flex h-screen bg-black overflow-hidden relative">
      <div className="absolute top-2 right-4 z-50 flex items-center gap-3">
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-gray-200 flex items-center gap-2">
              <span className="text-sm text-gray-500">Staff:</span>
              <span className="font-bold text-gray-800">{currentEmployee.name}</span>
          </div>
          <button onClick={handleLogout} className="bg-gray-800 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-black shadow-md">LOGOUT</button>
      </div>

      <div className="w-1/3 h-full pt-12">
        <PosCart cart={cart} subtotal={getSubtotal()} onRemoveItem={removeFromCart} onPaymentStart={handlePaymentStart} onEditNote={setEditingNoteItem} />
      </div>

      <div className="flex-1 h-full pt-12">
        <PosMenuGrid categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} filteredItems={filteredItems} onItemClick={handleItemClick} />
      </div>

      {/* --- Modals --- */}
      {showDayWarning && <DayWarningModal targetDay={warningTargetDay} onClose={() => setShowDayWarning(false)} />}
      {selectedItemForMod && <ModifierModal item={selectedItemForMod} modifiersObj={modifiersObj} onClose={() => setSelectedItemForMod(null)} onConfirm={addToCart} />}
      {editingNoteItem && <SpecialRequestModal initialNote={editingNoteItem.notes || ""} onClose={() => setEditingNoteItem(null)} onConfirm={handleSaveNote} />}
      
      {isOrderTypeOpen && <OrderTypeModal onSelect={handleOrderTypeSelect} onCancel={resetFlow} />}
      {isTableNumOpen && <TableNumberModal onConfirm={handleTableNumConfirm} onCancel={resetFlow} />}
      {isTipOpen && <TipModal subtotal={getSubtotal()} onSelectTip={handleTipSelect} />}
      
      <CashPaymentModal isOpen={isCashModalOpen} onClose={resetFlow} totalAmount={getSubtotal() + txn.tipAmount} onConfirm={handleCashPaymentConfirm} />

      {/* 카드 결제 진행 중 로딩 화면 */}
      {isCardProcessing && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex flex-col items-center justify-center text-white backdrop-blur-md">
           <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-white mb-8"></div>
           <h2 className="text-4xl font-black mb-4">{cardStatusMessage}</h2>
           <p className="text-xl text-gray-300">Do not refresh the page.</p>
        </div>
      )}
    </div>
  );
}