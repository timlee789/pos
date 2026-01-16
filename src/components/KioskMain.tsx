"use client";

import { useEffect } from 'react';
import { Category, MenuItem, ModifierGroup } from '@/lib/types';
import ItemCard from './ItemCard';
import ModifierModal from './ModifierModal';
import TableNumberModal from './TableNumberModal';
import OrderTypeModal from './OrderTypeModal'; 
import TipModal from './TipModal';
import DayWarningModal from './DayWarningModal';

// ✨ 분리된 Hook과 컴포넌트 임포트
import { useKiosk } from '@/hooks/useKiosk';
import KioskCartDrawer from './KioskCartDrawer';

interface Props {
  categories: Category[];
  items: MenuItem[];
  modifiersObj: { [key: string]: ModifierGroup };
}

export default function KioskMain({ categories, items, modifiersObj }: Props) {
  // ✨ Hook 하나로 모든 로직 호출
  const kiosk = useKiosk(categories, items);

  const filteredItems = items.filter(item => item.category === kiosk.activeTab);
  const totals = kiosk.calculateTotals();

  // 제스처 방지 로직 (그대로 유지)
  useEffect(() => {
    const handleContextMenu = (e: Event) => e.preventDefault();
    const handleTouchStart = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    const handleTouchMove = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || e.key === 'F12') e.preventDefault(); };
    
    document.addEventListener('contextmenu', handleContextMenu, { passive: false });
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleItemClick = (item: MenuItem) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayIndex = new Date().getDay();
    const targetDay = days.find(day => item.name.includes(day));

    if (targetDay && targetDay !== days[todayIndex]) {
      kiosk.setWarningTargetDay(targetDay);
      kiosk.setShowDayWarning(true);
      return;
    }
    if (!item.modifierGroups || item.modifierGroups.length === 0) {
      kiosk.handleAddToCart(item, []);
    } else {
      kiosk.setSelectedItem(item);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-100 relative overflow-hidden">
      
      {/* 1. 상단 헤더 */}
      <div className="bg-white border-b border-gray-200 shrink-0 z-30">
        <div className="pt-8 px-6 pb-2 text-center">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">The Collegiate Grill</h1>
          <p className="text-gray-400 font-bold tracking-widest text-sm uppercase mt-1">Since 1947</p>
        </div>
        <div className="flex overflow-x-auto px-4 py-4 gap-3 scrollbar-hide items-center">
          {categories.map((cat, index) => (
            <button
              key={cat.id || index}
              onClick={() => kiosk.setActiveTab(cat.name)}
              className={`flex-shrink-0 px-6 h-18 rounded-full text-2xl font-extrabold transition-all shadow-sm border-[3px] whitespace-nowrap
                ${kiosk.activeTab === cat.name ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              {cat.name === "Plates & Salads" ? "Salads" : cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 2. 아이템 리스트 */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
        <div className="grid grid-cols-3 gap-4 pb-32"> 
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <ItemCard key={`${item.id}-${index}`} item={item} onClick={() => handleItemClick(item)} />
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center pt-20 text-gray-500"><p className="text-2xl font-bold">No items available.</p></div>
          )}
        </div>
      </div>

      {/* 3. 플로팅 카트 버튼 */}
      <button 
        onClick={() => kiosk.setIsCartOpen(true)}
        className="absolute top-8 right-6 z-50 bg-white border-4 border-gray-100 p-4 rounded-[2.5rem] shadow-2xl active:scale-95 transition-all flex flex-col items-center justify-center gap-2 w-32 h-32"
      >
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-14 h-14 text-gray-900">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          {kiosk.cart.length > 0 && (
            <span className="absolute -top-3 -right-3 bg-red-600 text-white text-xl font-black w-10 h-10 flex items-center justify-center rounded-full border-4 border-white shadow-md">{kiosk.cart.length}</span>
          )}
        </div>
        {kiosk.cart.length > 0 && <span className="font-black text-gray-900 text-xl tracking-tight">${totals.grandTotal.toFixed(0)}</span>}
      </button>

      {/* ✨ [분리된 컴포넌트] 슬라이드 카트 Drawer */}
      <KioskCartDrawer 
        isOpen={kiosk.isCartOpen}
        onClose={() => kiosk.setIsCartOpen(false)}
        cart={kiosk.cart}
        onRemove={kiosk.removeFromCart}
        onClear={() => kiosk.setCart([])}
        onPay={kiosk.handlePayNowClick} // ✨ 수정된 분기 로직이 담긴 핸들러 전달
        totals={totals}
        cartEndRef={kiosk.cartEndRef}
      />

      {/* 모달들 */}
      {kiosk.selectedItem && <ModifierModal item={kiosk.selectedItem} modifiersObj={modifiersObj} onClose={() => kiosk.setSelectedItem(null)} onConfirm={kiosk.handleAddToCart} />}
      {kiosk.showTableModal && <TableNumberModal onConfirm={kiosk.handleTableNumberConfirm} onCancel={() => kiosk.setShowTableModal(false)} />}
      {kiosk.showOrderTypeModal && <OrderTypeModal onSelect={(type) => { kiosk.setSelectedOrderType(type); kiosk.setShowOrderTypeModal(false); kiosk.setShowTipModal(true); }} onCancel={() => kiosk.setShowOrderTypeModal(false)} />}
      {kiosk.showTipModal && <TipModal subtotal={totals.subtotal} onSelectTip={(tip) => { kiosk.setSelectedTipAmount(tip); kiosk.setShowTipModal(false); kiosk.processRealPayment(tip); }} />}
      {kiosk.showDayWarning && <DayWarningModal targetDay={kiosk.warningTargetDay} onClose={() => kiosk.setShowDayWarning(false)} />}
      
      {/* 로딩/성공 화면 */}
      {kiosk.isProcessing && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center w-[90%] text-center">
              <div className="mb-6 animate-spin"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 text-blue-600"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg></div>
              <h2 className="text-3xl font-black text-gray-900 mb-4">Processing...</h2>
              <p className="text-xl text-gray-600">Please check the Card Reader.</p>
           </div>
         </div>
      )}
      {kiosk.isSuccess && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center w-[90%] text-center animate-bounce-in">
              <div className="mb-4 bg-green-100 rounded-full p-6"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-16 h-16 text-green-600"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg></div>
              <h2 className="text-4xl font-black text-gray-900 mb-2">Thank You!</h2>
              <p className="text-xl text-gray-500 mb-6">Payment Complete.</p>
              <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-3xl w-full shadow-md">
                <p className="text-lg text-gray-800 font-bold leading-tight mb-2">🥤 If you ordered a Drink,</p>
                <p className="text-xl text-blue-800 font-black leading-tight">Please <span className="text-red-600 underline">SHOW RECEIPT</span> for a cup.</p>
              </div>
           </div>
         </div>
      )}
    </div>
  );
}