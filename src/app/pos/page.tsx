'use client';

import { useState, useEffect } from 'react';
import { getPosData } from '@/lib/dataFetcher';
import { MenuItem, Category, CartItem, ModifierOption, ModifierGroup } from '@/lib/types';
import PosMenuGrid from '@/components/pos/PosMenuGrid';
import PosCart from '@/components/pos/PosCart';
import CashPaymentModal from '@/components/pos/CashPaymentModal';
import OrderTypeModal from '@/components/shared/OrderTypeModal';
import TableNumberModal from '@/components/shared/TableNumberModal';
import TipModal from '@/components/shared/TipModal';
import ModifierModal from '@/components/shared/ModifierModal';
import DayWarningModal from '@/components/shared/DayWarningModal';
import EmployeeLogin from '@/components/pos/EmployeeLogin';
import SpecialRequestModal from '@/components/pos/SpecialRequestModal';
import CustomerNameModal from '@/components/pos/CustomerNameModal';
import OrderListModal from '@/components/pos/OrderListModal';

const ADMIN_CONFIG = {
  enableToGoTableNum: true, 
};

// 프린터 서버 IP (Kiosk PC의 IP)
const PRINTER_SERVER_URL = 'http://192.168.50.106:4000/print';

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

export default function PosPage() {
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [modifiersObj, setModifiersObj] = useState<{ [key: string]: ModifierGroup }>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);

  // 주문 관련 상태
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null); 
  const [isOrderListOpen, setIsOrderListOpen] = useState(false);

  // 모달 상태들
  const [isOrderTypeOpen, setIsOrderTypeOpen] = useState(false);
  const [isTableNumOpen, setIsTableNumOpen] = useState(false);
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [selectedItemForMod, setSelectedItemForMod] = useState<MenuItem | null>(null);
  const [showDayWarning, setShowDayWarning] = useState(false);
  const [warningTargetDay, setWarningTargetDay] = useState('');
  const [editingNoteItem, setEditingNoteItem] = useState<CartItem | null>(null);
  const [isPhoneOrderModalOpen, setIsPhoneOrderModalOpen] = useState(false);

  // 카드 결제 상태
  const [isCardProcessing, setIsCardProcessing] = useState(false);
  const [cardStatusMessage, setCardStatusMessage] = useState('');

  const [txn, setTxn] = useState<TransactionState>({
    method: null, orderType: null, tableNum: null, tipAmount: 0,
  });

  // 뒤로가기 방지
  useEffect(() => {
    history.pushState(null, '', location.href);
    const handlePopState = () => history.pushState(null, '', location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 데이터 로드
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

  // 카트 로직
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
          const friesItem = menuItems.find(i => i.name === '1/2 FF' || i.name === 'French Fries');
          if (friesItem) newItems.push({ ...friesItem, selectedModifiers: [], totalPrice: 0, quantity: 1, uniqueCartId: Date.now().toString() + Math.random(), name: `(Set) ${friesItem.name}`, groupId: currentGroupId } as any);
       }
       if (desc.includes('drink')) {
          const drinkItem = menuItems.find(i => i.name === 'Soft Drink');
          if (drinkItem) newItems.push({ ...drinkItem, selectedModifiers: [], totalPrice: 0, quantity: 1, uniqueCartId: Date.now().toString() + Math.random(), name: `(Set) ${drinkItem.name}`, groupId: currentGroupId } as any);
       }
     }
     setCart((prev) => [...prev, ...newItems]);
     setSelectedItemForMod(null);
  };

  const removeFromCart = (uniqueId: string) => {
    setCart(prev => {
        const targetItem = prev.find(item => item.uniqueCartId === uniqueId);
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

  // 전화 주문 로직
  const handlePhoneOrderClick = () => {
    if (cart.length === 0) return alert('⚠️ Cart is empty.');
    setIsPhoneOrderModalOpen(true);
  };

  const handlePhoneOrderConfirm = async (customerName: string) => {
    setIsPhoneOrderModalOpen(false); 
    const subtotalVal = getSubtotal();
    const displayTableNum = `To Go: ${customerName}`;

    try {
        console.log("=== Creating Phone Order (Open) ===");
        const saveRes = await fetch('/api/orders/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: cart,
                subtotal: subtotalVal,
                tax: 0, tip: 0, total: subtotalVal,
                paymentMethod: 'PENDING',
                orderType: 'to_go',
                tableNum: displayTableNum,
                employeeName: currentEmployee?.name || 'Unknown',
                status: 'open' 
            })
        });

        const orderResult = await saveRes.json();
        if (!orderResult.success) throw new Error("DB Save Failed: " + orderResult.error);
        
        try {
            await fetch(PRINTER_SERVER_URL, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart,
                    orderNumber: orderResult.orderNumber, 
                    tableNumber: displayTableNum,
                    orderType: 'to_go',
                    date: new Date().toLocaleString(),
                    subtotal: subtotalVal, tax: 0, tipAmount: 0, totalAmount: subtotalVal,
                    paymentMethod: "Unpaid (Phone)", 
                    employeeName: currentEmployee?.name || 'Unknown',
                    printKitchenOnly: true 
                })
            });
            alert(`✅ Phone Order #${orderResult.orderNumber} Created!`);
        } catch (e) { console.error(e); alert("Saved but Print Failed."); }

        setCart([]);
        setCurrentOrderId(null);

    } catch (error: any) { alert("Error: " + error.message); }
  };

  // Recall 로직
  const handleRecallOrder = (order: any) => {
    const recreatedCart: CartItem[] = order.order_items.map((dbItem: any, idx: number) => ({
        id: dbItem.menu_item_id,
        name: dbItem.item_name,
        price: dbItem.price,
        quantity: dbItem.quantity,
        selectedModifiers: dbItem.modifiers || [],
        totalPrice: dbItem.price,
        uniqueCartId: `recalled-${order.id}-${idx}`,
        notes: dbItem.notes || ''
    }));

    setCart(recreatedCart);
    
    let orderType: 'dine_in' | 'to_go' = 'dine_in';
    let tableNumVal = order.table_number;

    if (order.order_type === 'to_go' || order.table_number.toLowerCase().includes('to go')) {
        orderType = 'to_go';
    }

    setTxn({
        method: null,
        orderType: orderType,
        tableNum: tableNumVal,
        tipAmount: 0
    });

    setCurrentOrderId(order.id);
    setIsOrderListOpen(false);
  };

  // 환불 로직 (Step 4 추가됨)
  const handleRefundOrder = async (order: any) => {
    if (!confirm(`⚠️ REFUND WARNING ⚠️\n\nRefund Order #${order.order_number}?\nAmount: $${order.total_amount.toFixed(2)}`)) return;
    
    try {
        const res = await fetch('/api/stripe/refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: order.id,
                paymentIntentId: order.transaction_id,
                amount: order.total_amount
            })
        });

        const result = await res.json();
        if (result.success) {
            alert("✅ Refund Successful!");
            setIsOrderListOpen(false); 
        } else {
            throw new Error(result.error);
        }
    } catch (e: any) {
        console.error(e);
        alert("❌ Refund Failed: " + e.message);
    }
  };

  // 결제 진행 핸들러
  const handlePaymentStart = (method: 'CASH' | 'CARD') => {
    if (cart.length === 0) return alert('Cart is empty.');
    if (currentOrderId && txn.tableNum) {
        setTxn(prev => ({ ...prev, method }));
        setIsTipOpen(true);
    } else {
        setTxn({ method, orderType: null, tableNum: null, tipAmount: 0 });
        setIsOrderTypeOpen(true);
    }
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
    if (txn.method === 'CASH') setIsCashModalOpen(true);
    else handleCardPayment(amt);
  };

  // ✨ [수정됨] 결제 완료 및 DB 저장 (수수료 로직 + transactionId 처리)
  const finalizeTransaction = async (paymentMethod: 'CASH' | 'CARD', transactionId: string | null = null) => {
    try {
        const subtotalVal = getSubtotal();
        
        // 카드일 경우 3% 수수료
        const creditCardFee = paymentMethod === 'CARD' ? subtotalVal * 0.03 : 0;
        
        // 최종 금액 = 소계 + 수수료 + 팁
        const finalTotal = subtotalVal + creditCardFee + txn.tipAmount;
        
        const displayTableNum = txn.tableNum 
            ? (txn.orderType === 'to_go' ? `To Go #${txn.tableNum}` : txn.tableNum)
            : (txn.orderType === 'to_go' ? 'To Go' : '00');

        console.log(`=== Finalizing Transaction (Fee: ${creditCardFee}) ===`);
        let newOrderNumber = '';

        if (currentOrderId) {
            // Update Existing Order
            console.log(`Updating existing order ${currentOrderId}...`);
            const updateRes = await fetch('/api/orders/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: currentOrderId,
                    paymentMethod: paymentMethod,
                    transactionId: transactionId, // ✨ 쉼표 추가됨!
                    tip: txn.tipAmount,
                    total: finalTotal 
                })
            });
            const updateResult = await updateRes.json();
            if (!updateResult.success) throw new Error("Update Failed: " + updateResult.error);
            newOrderNumber = updateResult.order.order_number; 

        } else {
            // Create New Order
            const saveRes = await fetch('/api/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart,
                    subtotal: subtotalVal,
                    tax: creditCardFee, 
                    tip: txn.tipAmount,
                    total: finalTotal,
                    paymentMethod: paymentMethod,
                    transactionId: transactionId, // ✨ 쉼표 추가됨!
                    orderType: txn.orderType,
                    tableNum: displayTableNum,
                    employeeName: currentEmployee?.name || 'Unknown',
                    status: 'paid' 
                })
            });
            const orderResult = await saveRes.json();
            if (!orderResult.success) throw new Error("DB Save Failed: " + orderResult.error);
            newOrderNumber = orderResult.orderNumber;
        }

        try {
            await fetch(PRINTER_SERVER_URL, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart,
                    orderNumber: newOrderNumber, 
                    tableNumber: displayTableNum,
                    orderType: txn.orderType,
                    date: new Date().toLocaleString(),
                    subtotal: subtotalVal,
                    tax: creditCardFee, 
                    tipAmount: txn.tipAmount,
                    totalAmount: finalTotal,
                    paymentMethod: paymentMethod,
                    employeeName: currentEmployee?.name || 'Unknown' 
                })
            });
        } catch (e) { console.error("Printer Error:", e); }

        if (paymentMethod === 'CARD') {
            setCardStatusMessage("✅ Payment Complete!");
            await new Promise(r => setTimeout(r, 1000));
            setIsCardProcessing(false);
        } else {
            alert(`Order #${newOrderNumber} Complete!`);
        }

        setCart([]); 
        setTxn({ method: null, orderType: null, tableNum: null, tipAmount: 0 });
        setCurrentOrderId(null); 
        
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

  // 카드 결제 로직
  const handleCardPayment = async (currentTip: number) => {
      setIsCardProcessing(true);
      
      const subtotal = getSubtotal();
      const ccFee = subtotal * 0.03;
      const totalToPay = subtotal + ccFee + currentTip;

      setCardStatusMessage(`Charging $${totalToPay.toFixed(2)} (incl. 3% fee)...`);
      
      try {
        const processRes = await fetch('/api/stripe/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: totalToPay }),
        });
        const processData = await processRes.json();
        if (!processData.success) throw new Error(processData.error);
        
        const { paymentIntentId } = processData;
        setCardStatusMessage("💳 Please Tap or Insert Card");

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
            if (checkData.status === 'succeeded') { isSuccess = true; break; } 
            else if (checkData.status === 'failed') { throw new Error("Failed / Canceled"); }
        }
        if (isSuccess) {
            setCardStatusMessage("Processing Order...");
            await finalizeTransaction('CARD', paymentIntentId);
        } else { throw new Error("Payment Timeout"); }
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
  const handleLogout = () => { setCurrentEmployee(null); setCart([]); setCurrentOrderId(null); };

  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === categories.find(c => c.id === selectedCategory)?.name);

  if (!currentEmployee) return <EmployeeLogin onLoginSuccess={setCurrentEmployee} />;
  if (isLoading) return <div className="flex h-screen items-center justify-center font-bold">Loading...</div>;

  return (
    <div className="flex h-screen bg-black overflow-hidden relative">
      <div className="absolute top-2 right-4 z-50 flex items-center gap-3">
          <button 
             onClick={() => setIsOrderListOpen(true)}
             className="px-4 py-2 rounded-full text-sm font-black shadow-md transition-all border bg-blue-600 text-white border-blue-500 hover:bg-blue-500 flex items-center gap-2"
          >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
               <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
             </svg>
             ORDERS
          </button>

          <div className="bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-gray-700 flex items-center gap-2">
              <span className="text-sm text-gray-400">Staff:</span>
              <span className="font-bold text-white">{currentEmployee.name}</span>
          </div>
          <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-red-700 shadow-md">LOGOUT</button>
      </div>

      <div className="w-1/3 h-full pt-12">
        <PosCart 
           cart={cart} 
           subtotal={getSubtotal()} 
           onRemoveItem={removeFromCart} 
           onPaymentStart={handlePaymentStart} 
           onEditNote={setEditingNoteItem} 
           onPhoneOrder={handlePhoneOrderClick}
        />
      </div>

      <div className="flex-1 h-full pt-12">
        <PosMenuGrid categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} filteredItems={filteredItems} onItemClick={handleItemClick} />
      </div>

      {showDayWarning && <DayWarningModal targetDay={warningTargetDay} onClose={() => setShowDayWarning(false)} />}
      {selectedItemForMod && <ModifierModal item={selectedItemForMod} modifiersObj={modifiersObj} onClose={() => setSelectedItemForMod(null)} onConfirm={addToCart} />}
      {editingNoteItem && <SpecialRequestModal initialNote={editingNoteItem.notes || ""} onClose={() => setEditingNoteItem(null)} onConfirm={handleSaveNote} />}
      
      {isOrderTypeOpen && <OrderTypeModal onSelect={handleOrderTypeSelect} onCancel={resetFlow} />}
      {isTableNumOpen && <TableNumberModal onConfirm={handleTableNumConfirm} onCancel={resetFlow} />}
      {isTipOpen && <TipModal subtotal={getSubtotal()} onSelectTip={handleTipSelect} />}
      
      {isPhoneOrderModalOpen && <CustomerNameModal onClose={() => setIsPhoneOrderModalOpen(false)} onConfirm={handlePhoneOrderConfirm} />}
      
      {isOrderListOpen && <OrderListModal onClose={() => setIsOrderListOpen(false)} onRecallOrder={handleRecallOrder} onRefundOrder={handleRefundOrder} />}

      <CashPaymentModal isOpen={isCashModalOpen} onClose={resetFlow} totalAmount={getSubtotal() + txn.tipAmount} onConfirm={handleCashPaymentConfirm} />

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