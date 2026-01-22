// src/hooks/usePosLogic.ts
import { useState, useEffect } from 'react';
import { getPosData } from '@/lib/dataFetcher';
import { MenuItem, Category, CartItem, ModifierOption, ModifierGroup } from '@/lib/types';

// 상수 정의
const ADMIN_CONFIG = { enableToGoTableNum: true };
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

export function usePosLogic() {
  // --- State ---
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [modifiersObj, setModifiersObj] = useState<{ [key: string]: ModifierGroup }>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);

  // Orders & Transaction
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null); 
  const [isOrderListOpen, setIsOrderListOpen] = useState(false);
  const [txn, setTxn] = useState<TransactionState>({ method: null, orderType: null, tableNum: null, tipAmount: 0 });

  // Modals
  const [isOrderTypeOpen, setIsOrderTypeOpen] = useState(false);
  const [isTableNumOpen, setIsTableNumOpen] = useState(false);
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isPhoneOrderModalOpen, setIsPhoneOrderModalOpen] = useState(false);
  
  const [selectedItemForMod, setSelectedItemForMod] = useState<MenuItem | null>(null);
  const [editingNoteItem, setEditingNoteItem] = useState<CartItem | null>(null);
  
  const [showDayWarning, setShowDayWarning] = useState(false);
  const [warningTargetDay, setWarningTargetDay] = useState('');

  // Payment Status
  const [isCardProcessing, setIsCardProcessing] = useState(false);
  const [cardStatusMessage, setCardStatusMessage] = useState('');

  // --- Effects ---
  useEffect(() => {
    history.pushState(null, '', location.href);
    const handlePopState = () => history.pushState(null, '', location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  // --- Logic Functions ---

  const getSubtotal = () => cart.reduce((sum, item) => sum + (item.totalPrice * item.quantity), 0);

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

  // --- Phone Order ---
  const handlePhoneOrderClick = () => {
    if (cart.length === 0) return alert('⚠️ Cart is empty.');
    setIsPhoneOrderModalOpen(true);
  };

  const handlePhoneOrderConfirm = async (customerName: string) => {
    setIsPhoneOrderModalOpen(false); 
    const subtotalVal = getSubtotal();
    const displayTableNum = `To Go: ${customerName}`;

    try {
        const saveRes = await fetch('/api/orders/create', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: cart, subtotal: subtotalVal, tax: 0, tip: 0, total: subtotalVal,
                paymentMethod: 'PENDING', orderType: 'to_go', tableNum: displayTableNum,
                employeeName: currentEmployee?.name || 'Unknown', status: 'open' 
            })
        });
        const orderResult = await saveRes.json();
        if (!orderResult.success) throw new Error("DB Save Failed: " + orderResult.error);
        
        try {
            await fetch(PRINTER_SERVER_URL, { 
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart, orderNumber: orderResult.orderNumber, tableNumber: displayTableNum,
                    orderType: 'to_go', date: new Date().toLocaleString(),
                    subtotal: subtotalVal, tax: 0, tipAmount: 0, totalAmount: subtotalVal,
                    paymentMethod: "Unpaid (Phone)", employeeName: currentEmployee?.name || 'Unknown', printKitchenOnly: true 
                })
            });
            alert(`✅ Phone Order #${orderResult.orderNumber} Created!`);
        } catch (e) { console.error(e); alert("Saved but Print Failed."); }
        setCart([]);
        setCurrentOrderId(null);
    } catch (error: any) { alert("Error: " + error.message); }
  };

  // --- Recall & Refund ---
  const handleRecallOrder = (order: any) => {
    const recreatedCart: CartItem[] = order.order_items.map((dbItem: any, idx: number) => ({
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

  const handleRefundOrder = async (order: any) => {
    if (!confirm(`⚠️ REFUND WARNING ⚠️\n\nRefund Order #${order.order_number}?\nAmount: $${order.total_amount.toFixed(2)}`)) return;
    try {
        const res = await fetch('/api/stripe/refund', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id, paymentIntentId: order.transaction_id, amount: order.total_amount })
        });
        const result = await res.json();
        if (result.success) { alert("✅ Refund Successful!"); setIsOrderListOpen(false); } 
        else { throw new Error(result.error); }
    } catch (e: any) { alert("❌ Refund Failed: " + e.message); }
  };

  // --- Transaction Flow ---
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

  const finalizeTransaction = async (paymentMethod: 'CASH' | 'CARD', transactionId: string | null = null) => {
    try {
        const subtotalVal = getSubtotal();
        const creditCardFee = paymentMethod === 'CARD' ? subtotalVal * 0.03 : 0;
        const finalTotal = subtotalVal + creditCardFee + txn.tipAmount;
        const displayTableNum = txn.tableNum ? (txn.orderType === 'to_go' ? `To Go #${txn.tableNum}` : txn.tableNum) : (txn.orderType === 'to_go' ? 'To Go' : '00');
        let newOrderNumber = '';

        if (currentOrderId) {
            const updateRes = await fetch('/api/orders/update', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: currentOrderId, paymentMethod, transactionId, tip: txn.tipAmount, total: finalTotal })
            });
            const updateResult = await updateRes.json();
            if (!updateResult.success) throw new Error("Update Failed: " + updateResult.error);
            newOrderNumber = updateResult.order.order_number; 
        } else {
            const saveRes = await fetch('/api/orders/create', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart, subtotal: subtotalVal, tax: creditCardFee, tip: txn.tipAmount, total: finalTotal,
                    paymentMethod, transactionId, orderType: txn.orderType, tableNum: displayTableNum,
                    employeeName: currentEmployee?.name || 'Unknown', status: 'paid' 
                })
            });
            const orderResult = await saveRes.json();
            if (!orderResult.success) throw new Error("DB Save Failed: " + orderResult.error);
            newOrderNumber = orderResult.orderNumber;
        }

        try {
            await fetch(PRINTER_SERVER_URL, { 
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart, orderNumber: newOrderNumber, tableNumber: displayTableNum, orderType: txn.orderType,
                    date: new Date().toLocaleString(), subtotal: subtotalVal, tax: creditCardFee, tipAmount: txn.tipAmount,
                    totalAmount: finalTotal, paymentMethod, employeeName: currentEmployee?.name || 'Unknown' 
                })
            });
        } catch (e) { console.error("Printer Error:", e); }

        if (paymentMethod === 'CARD') {
            setCardStatusMessage("✅ Payment Complete!");
            await new Promise(r => setTimeout(r, 1000));
            setIsCardProcessing(false);
        } else { alert(`Order #${newOrderNumber} Complete!`); }

        setCart([]); 
        setTxn({ method: null, orderType: null, tableNum: null, tipAmount: 0 });
        setCurrentOrderId(null); 
        
    } catch (error: any) {
        alert("Transaction Error: " + error.message);
        setIsCardProcessing(false);
    }
  };

  const handleCashPaymentConfirm = (received: number, change: number) => {
      setIsCashModalOpen(false);
      alert(`Please return change: $${change.toFixed(2)}`);
      finalizeTransaction('CASH');
  };

  const handleCardPayment = async (currentTip: number) => {
      setIsCardProcessing(true);
      const subtotal = getSubtotal();
      const ccFee = subtotal * 0.03;
      const totalToPay = subtotal + ccFee + currentTip;

      setCardStatusMessage(`Charging $${totalToPay.toFixed(2)} (incl. 3% fee)...`);
      try {
        const processRes = await fetch('/api/stripe/process', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: totalToPay }),
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
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentIntentId }),
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
          alert("Card Payment Error: " + error.message);
          setIsCardProcessing(false);
      }
  };

  const resetFlow = () => {
    setIsOrderTypeOpen(false); setIsTableNumOpen(false); setIsTipOpen(false); 
    setIsCashModalOpen(false); setSelectedItemForMod(null); setShowDayWarning(false);
  };

  const handleLogout = () => { setCurrentEmployee(null); setCart([]); setCurrentOrderId(null); };

  return {
    // State
    currentEmployee, setCurrentEmployee, cart, categories, menuItems, modifiersObj,
    selectedCategory, setSelectedCategory, isLoading, currentOrderId, 
    isOrderListOpen, setIsOrderListOpen, txn,
    isOrderTypeOpen, setIsOrderTypeOpen, isTableNumOpen, setIsTableNumOpen,
    isTipOpen, setIsTipOpen, isCashModalOpen, setIsCashModalOpen,
    isPhoneOrderModalOpen, setIsPhoneOrderModalOpen,
    selectedItemForMod, setSelectedItemForMod, editingNoteItem, setEditingNoteItem,
    showDayWarning, setShowDayWarning, warningTargetDay,
    isCardProcessing, cardStatusMessage,

    // Functions
    addToCart, removeFromCart, handleSaveNote, handleItemClick, getSubtotal,
    handlePhoneOrderClick, handlePhoneOrderConfirm,
    handleRecallOrder, handleRefundOrder,
    handlePaymentStart, handleOrderTypeSelect, handleTableNumConfirm, handleTipSelect,
    handleCashPaymentConfirm, resetFlow, handleLogout
  };
}