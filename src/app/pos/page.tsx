// src/app/pos/page.tsx
'use client';

import { usePosLogic } from '@/hooks/usePosLogic';
import PosMenuGrid from '@/components/pos/PosMenuGrid';
import PosCart from '@/components/pos/PosCart';
import PosHeader from '@/components/pos/PosHeader';
import EmployeeLogin from '@/components/pos/EmployeeLogin';

// Modals
import CashPaymentModal from '@/components/pos/CashPaymentModal';
import CardPaymentModal from '@/components/pos/CardPaymentModal';
import OrderTypeModal from '@/components/shared/OrderTypeModal';
import TableNumberModal from '@/components/shared/TableNumberModal';
import TipModal from '@/components/shared/TipModal';
import ModifierModal from '@/components/shared/ModifierModal';
import DayWarningModal from '@/components/shared/DayWarningModal';
import SpecialRequestModal from '@/components/pos/SpecialRequestModal';
import CustomerNameModal from '@/components/pos/CustomerNameModal';
import OrderListModal from '@/components/pos/OrderListModal';

export default function PosPage() {
  const {
    currentEmployee, setCurrentEmployee, cart, categories, menuItems, modifiersObj,
    selectedCategory, setSelectedCategory, isLoading, 
    isOrderListOpen, setIsOrderListOpen, txn,
    isOrderTypeOpen, isTableNumOpen, isTipOpen, isCashModalOpen,
    isPhoneOrderModalOpen, setIsPhoneOrderModalOpen,
    selectedItemForMod, closeModifierModal, 
    editingNoteItem, setEditingNoteItem,
    showDayWarning, setShowDayWarning, warningTargetDay,
    isCardProcessing, cardStatusMessage, handleCancelPayment,
    addToCart, removeFromCart, handleSaveNote, handleItemClick, getSubtotal,
    handlePhoneOrderClick, handlePhoneOrderConfirm,
    handleRecallOrder, handleRefundOrder,
    handlePaymentStart, handleOrderTypeSelect, handleTableNumConfirm, handleTipSelect,
    handleCashPaymentConfirm, resetFlow, handleLogout
  } = usePosLogic();

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-black text-white font-bold">Loading POS System...</div>;
  if (!currentEmployee) return <EmployeeLogin onLoginSuccess={setCurrentEmployee} />;

  // Safely filter items
  const activeCategory = categories.find(c => c.id === selectedCategory);
  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory?.name);

  const finalTotalAmount = getSubtotal() + (txn?.tipAmount || 0);

  return (
    <div className="flex h-screen bg-black overflow-hidden relative">
      <PosHeader employee={currentEmployee} onOpenOrders={() => setIsOrderListOpen(true)} onLogout={handleLogout} />

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
        <PosMenuGrid 
           categories={categories} 
           selectedCategory={selectedCategory} 
           onSelectCategory={setSelectedCategory} 
           filteredItems={filteredItems} 
           onItemClick={handleItemClick} 
        />
      </div>

      {/* Modals with correct prop mapping */}
      {showDayWarning && <DayWarningModal targetDay={warningTargetDay} onClose={() => setShowDayWarning(false)} />}
      
      {selectedItemForMod && (
        <ModifierModal 
          item={selectedItemForMod} 
          modifiersObj={modifiersObj} 
          onClose={closeModifierModal} 
          onConfirm={(item, options) => { addToCart(item, options); closeModifierModal(); }}
        />
      )}
      
      {editingNoteItem && (
        <SpecialRequestModal initialNote={editingNoteItem.notes || ""} onClose={() => setEditingNoteItem(null)} onConfirm={handleSaveNote} />
      )}
      
      {isOrderTypeOpen && <OrderTypeModal onSelect={handleOrderTypeSelect} onCancel={resetFlow} />}
      {isTableNumOpen && <TableNumberModal onConfirm={handleTableNumConfirm} onCancel={resetFlow} />}
      
      {isTipOpen && (
        <TipModal 
          subtotal={getSubtotal()} 
          onSelectTip={handleTipSelect} // Direct mapping to the function from hook
          onCancel={resetFlow}
        />
      )}
      
      {isPhoneOrderModalOpen && <CustomerNameModal onClose={() => setIsPhoneOrderModalOpen(false)} onConfirm={handlePhoneOrderConfirm} />}
      {isOrderListOpen && <OrderListModal onClose={() => setIsOrderListOpen(false)} onRecallOrder={handleRecallOrder} onRefundOrder={handleRefundOrder} />}

      <CashPaymentModal isOpen={isCashModalOpen} onClose={resetFlow} totalAmount={finalTotalAmount} onConfirm={handleCashPaymentConfirm} />

      <CardPaymentModal
        isOpen={isCardProcessing} 
        statusMessage={cardStatusMessage} 
        onCancel={handleCancelPayment}
      />
    </div>
  );
}