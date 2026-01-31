'use client';

import { usePosLogic } from '@/hooks/usePosLogic';
import PosMenuGrid from '@/components/pos/PosMenuGrid';
import PosCart from '@/components/pos/PosCart';
import PosHeader from '@/components/pos/PosHeader';
import EmployeeLogin from '@/components/pos/EmployeeLogin';

// Modals
import CashPaymentModal from '@/components/pos/CashPaymentModal';
import CardPaymentModal from '@/components/pos/CardPaymentModal'; // ✨ [추가] 카드 결제 모달 Import
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
    
    // ✨ [수정] handleCancelPayment 추가 (취소 버튼용)
    isCardProcessing, cardStatusMessage, handleCancelPayment,
    
    addToCart, removeFromCart, handleSaveNote, handleItemClick, getSubtotal,
    handlePhoneOrderClick, handlePhoneOrderConfirm,
    handleRecallOrder, handleRefundOrder,
    handlePaymentStart, handleOrderTypeSelect, handleTableNumConfirm, handleTipSelect,
    handleCashPaymentConfirm, resetFlow, handleLogout
  } = usePosLogic();

  if (!currentEmployee) return <EmployeeLogin onLoginSuccess={setCurrentEmployee} />;
  if (isLoading) return <div className="flex h-screen items-center justify-center font-bold">Loading...</div>;

  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === categories.find(c => c.id === selectedCategory)?.name);

  return (
    <div className="flex h-screen bg-black overflow-hidden relative">
      
      {/* 1. Header */}
      <PosHeader 
        employee={currentEmployee} 
        onOpenOrders={() => setIsOrderListOpen(true)} 
        onLogout={handleLogout} 
      />

      {/* 2. Left: Cart */}
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

      {/* 3. Right: Menu Grid */}
      <div className="flex-1 h-full pt-12">
        <PosMenuGrid 
           categories={categories} 
           selectedCategory={selectedCategory} 
           onSelectCategory={setSelectedCategory} 
           filteredItems={filteredItems} 
           onItemClick={handleItemClick} 
        />
      </div>

      {/* 4. Modals */}
      {showDayWarning && <DayWarningModal targetDay={warningTargetDay} onClose={() => setShowDayWarning(false)} />}
      
      {selectedItemForMod && (
        <ModifierModal 
          item={selectedItemForMod} 
          modifiersObj={modifiersObj} 
          onClose={closeModifierModal} 
          onConfirm={(item, options) => {
             addToCart(item, options);
             closeModifierModal(); 
          }}
        />
      )}
      
      {editingNoteItem && <SpecialRequestModal initialNote={editingNoteItem.notes || ""} onClose={() => setEditingNoteItem(null)} onConfirm={handleSaveNote} />}
      
      {isOrderTypeOpen && <OrderTypeModal onSelect={handleOrderTypeSelect} onCancel={resetFlow} />}
      
      {isTableNumOpen && <TableNumberModal onConfirm={handleTableNumConfirm} onCancel={resetFlow} />}
      
      {isTipOpen && (
        <TipModal 
          subtotal={getSubtotal()} 
          onSelectTip={handleTipSelect} 
          onCancel={() => { 
             resetFlow(); 
          }}
        />
      )}
      
      {isPhoneOrderModalOpen && <CustomerNameModal onClose={() => setIsPhoneOrderModalOpen(false)} onConfirm={handlePhoneOrderConfirm} />}
      
      {isOrderListOpen && <OrderListModal onClose={() => setIsOrderListOpen(false)} onRecallOrder={handleRecallOrder} onRefundOrder={handleRefundOrder} />}

      <CashPaymentModal isOpen={isCashModalOpen} onClose={resetFlow} totalAmount={getSubtotal() + txn.tipAmount} onConfirm={handleCashPaymentConfirm} />

      {/* ✨ [핵심 수정] 5. Card Payment Modal (취소 기능 포함) */}
      {/* 기존의 단순 div를 삭제하고 아래 컴포넌트로 교체했습니다 */}
      <CardPaymentModal
        isOpen={isCardProcessing}
        statusMessage={cardStatusMessage}
        onCancel={handleCancelPayment}
      />

    </div>
  );
}