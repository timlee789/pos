"use client";

import { Category, MenuItem, ModifierGroup } from '@/lib/types';
// ✨ [체크] 이 파일이 src/hooks/useKioskLogic.ts 위치에 있어야 합니다.
import { useKioskLogic } from '@/hooks/useKioskLogic';

// UI Components (같은 kiosk 폴더 내에 있으므로 ./ 사용)
import KioskHeader from './KioskHeader';
import KioskCartDrawer from './KioskCartDrawer';
import ItemCard from './ItemCard';

// ✨ [수정] Modals (shared 폴더로 경로 변경)
import ModifierModal from '@/components/shared/ModifierModal';
import OrderTypeModal from '@/components/shared/OrderTypeModal';
import TableNumberModal from '@/components/shared/TableNumberModal';
import TipModal from '@/components/shared/TipModal';
import DayWarningModal from '@/components/shared/DayWarningModal';

interface Props {
  categories: Category[];
  items: MenuItem[];
  modifiersObj: { [key: string]: ModifierGroup };
}

export default function KioskMain({ categories, items, modifiersObj }: Props) {
  // Hook에서 모든 로직과 상태를 가져옴
  const {
    activeTab, setActiveTab,
    cart, cartEndRef,
    isCartOpen, setIsCartOpen,
    selectedItem, setSelectedItem,
    showOrderTypeModal, setShowOrderTypeModal,
    showTableModal, setShowTableModal,
    showTipModal, setShowTipModal,
    showDayWarning, setShowDayWarning,
    warningTargetDay, isProcessing, isSuccess,
    addToCart, removeFromCart, handleItemClick,
    setSelectedOrderType, setCurrentTableNumber,
    processRealPayment, resetToHome, calculateTotals
  } = useKioskLogic(categories, items);

  const filteredItems = items.filter(item => item.category === activeTab);
  const totals = calculateTotals();

  return (
    <div className="flex flex-col h-full w-full bg-gray-100 relative overflow-hidden">
      
      {/* 1. Header (로고 & 카테고리) */}
      <KioskHeader 
        categories={categories} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      {/* 2. Menu Grid */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
        <div className="grid grid-cols-3 gap-4 pb-32"> 
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <ItemCard 
                key={`${item.id}-${index}`} 
                item={item} 
                onClick={() => handleItemClick(item)} 
              />
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center pt-20 text-gray-500">
                <p className="text-2xl font-bold">No items available.</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Floating Cart Button */}
      <button 
          onClick={() => setIsCartOpen(true)}
          className="absolute top-8 right-6 z-50 bg-white border-4 border-gray-100 p-4 rounded-[2.5rem] shadow-2xl active:scale-95 transition-all flex flex-col items-center justify-center gap-2 w-32 h-32"
      >
          <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-14 h-14 text-gray-900">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          {cart.length > 0 && (
              <span className="absolute -top-3 -right-3 bg-red-600 text-white text-xl font-black w-10 h-10 flex items-center justify-center rounded-full border-4 border-white shadow-md">
              {cart.length}
              </span>
          )}
          </div>
          {cart.length > 0 && (
              <span className="font-black text-gray-900 text-xl tracking-tight">${totals.grandTotal.toFixed(0)}</span>
          )}
      </button>

      {/* 4. Drawer UI */}
      <KioskCartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemove={removeFromCart}
        cartEndRef={cartEndRef}
        totals={totals}
        onPayNow={() => { setIsCartOpen(false); setShowOrderTypeModal(true); }}
        onClear={() => resetToHome()}
      />

      {/* 5. Modals (Logic Flow) */}
      {selectedItem && (
        <ModifierModal 
          item={selectedItem} 
          modifiersObj={modifiersObj} 
          onClose={() => setSelectedItem(null)} 
          onConfirm={addToCart} 
        />
      )}
      
      {showOrderTypeModal && (
        <OrderTypeModal 
          onSelect={(type) => {
            setSelectedOrderType(type);
            setShowOrderTypeModal(false);
            setShowTableModal(true); // 무조건 테이블 모달로
          }} 
          onCancel={() => setShowOrderTypeModal(false)} 
        />
      )}
      
      {showTableModal && (
        <TableNumberModal 
          onConfirm={(num) => {
            setCurrentTableNumber(num);
            setShowTableModal(false);
            setShowTipModal(true);
          }} 
          onCancel={() => { setShowTableModal(false); setShowOrderTypeModal(true); }} 
        />
      )}
      
      {showTipModal && (
        <TipModal 
          subtotal={totals.subtotal} 
          onSelectTip={(tip) => {
            setShowTipModal(false);
            processRealPayment(tip);
          }} 
          onCancel={() => { setShowTipModal(false); setShowTableModal(true); }} 
        />
      )}
      
      {showDayWarning && <DayWarningModal targetDay={warningTargetDay} onClose={() => setShowDayWarning(false)} />}
      
      {/* 6. Status Overlays */}
      {isProcessing && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center w-[90%] text-center">
              <div className="mb-6 animate-spin"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 text-blue-600"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg></div>
              <h2 className="text-3xl font-black text-gray-900 mb-4">Processing...</h2>
              <p className="text-xl text-gray-600">Please check the Card Reader.</p>
           </div>
         </div>
      )}
      {isSuccess && (
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