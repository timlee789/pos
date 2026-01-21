'use client';

import { useState } from 'react';
import { MenuItem, Category, CartItem, ModifierOption, ModifierGroup } from '@/lib/types';
import KioskMain from '@/components/kiosk/KioskMain';
import KioskCartDrawer from '@/components/kiosk/KioskCartDrawer';
import OrderTypeModal from '@/components/shared/OrderTypeModal';
import TableNumberModal from '@/components/shared/TableNumberModal';
import ModifierModal from '@/components/shared/ModifierModal';
import DayWarningModal from '@/components/shared/DayWarningModal';

// 프린터 서버 IP
const PRINTER_SERVER_URL = 'http://192.168.50.106:4000/print';

interface KioskClientProps {
  initialCategories: Category[];
  initialItems: MenuItem[];
  initialModifiers: { [key: string]: ModifierGroup };
}

export default function KioskClient({ 
  initialCategories, 
  initialItems, 
  initialModifiers 
}: KioskClientProps) {
  
  // 데이터는 props로 받았으므로 바로 사용
  const categories = initialCategories;
  const menuItems = initialItems;
  const modifiersObj = initialModifiers;

  const [selectedCategory, setSelectedCategory] = useState<string>(
    categories.length > 0 ? categories[0].id : 'All'
  );
  const [cart, setCart] = useState<CartItem[]>([]);

  // Modals & Order State
  const [isOrderTypeOpen, setIsOrderTypeOpen] = useState(true);
  const [isTableNumOpen, setIsTableNumOpen] = useState(false);
  const [selectedItemForMod, setSelectedItemForMod] = useState<MenuItem | null>(null);
  const [showDayWarning, setShowDayWarning] = useState(false);
  const [warningTargetDay, setWarningTargetDay] = useState('');
  
  const [orderType, setOrderType] = useState<'dine_in' | 'to_go' | null>(null);
  const [tableNum, setTableNum] = useState<string | null>(null);

  // --- Cart Logic ---
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

  const handleOrderTypeSelect = (type: 'dine_in' | 'to_go') => {
    setOrderType(type);
    setIsOrderTypeOpen(false);
    if (type === 'dine_in') setIsTableNumOpen(true);
  };

  const handleTableNumConfirm = (num: string) => {
    setTableNum(num);
    setIsTableNumOpen(false);
  };

  const handleReset = () => {
    if(confirm("Start a new order?")) {
      setCart([]);
      setOrderType(null);
      setTableNum(null);
      setIsOrderTypeOpen(true);
    }
  };

  const handlePaymentComplete = () => {
    setCart([]);
    setOrderType(null);
    setTableNum(null);
    setIsOrderTypeOpen(true);
  };

  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === categories.find(c => c.id === selectedCategory)?.name);

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden relative">
      <div className="flex justify-between items-center p-4 bg-gray-900 border-b border-gray-800">
        <h1 className="text-3xl font-black text-white">COLLEGIATE GRILL</h1>
        <button onClick={handleReset} className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-full font-bold text-white transition-colors">START OVER</button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <KioskMain 
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          filteredItems={filteredItems}
          onItemClick={handleItemClick}
        />
      </div>

      <KioskCartDrawer 
        cart={cart}
        onRemoveItem={removeFromCart}
        subtotal={getSubtotal()}
        orderType={orderType}
        tableNum={tableNum}
        onPaymentComplete={handlePaymentComplete}
        printerServerUrl={PRINTER_SERVER_URL}
      />

      {isOrderTypeOpen && <OrderTypeModal onSelect={handleOrderTypeSelect} onCancel={() => {}} />} 
      {isTableNumOpen && <TableNumberModal onConfirm={handleTableNumConfirm} onCancel={() => setIsOrderTypeOpen(true)} />}
      
      {selectedItemForMod && (
        <ModifierModal item={selectedItemForMod} modifiersObj={modifiersObj} onClose={() => setSelectedItemForMod(null)} onConfirm={addToCart} />
      )}
      
      {showDayWarning && (
        <DayWarningModal targetDay={warningTargetDay} onClose={() => setShowDayWarning(false)} />
      )}
    </div>
  );
}