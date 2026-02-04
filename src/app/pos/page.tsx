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
    // ✨ [리팩토링]훅에서 가져오는 상태 및 함수 변경
    currentEmployee, setCurrentEmployee, cart, categories, menuItems, modifiersObj,
    selectedCategory, setSelectedCategory, isLoading, 
    flowState, dispatch, // 새로운 상태와 디스패치 함수
    selectedItemForMod, closeModifierModal, setSelectedItemForMod,
    editingNoteItem, setEditingNoteItem,
    showDayWarning, setShowDayWarning, warningTargetDay,
    isCardProcessing, cardStatusMessage,
    addToCart, removeFromCart, handleSaveNote, handleItemClick, getSubtotal,
    handlePhoneOrderConfirm, handleRecallOrder, handleRefundOrder, 
    handleTipSelectAndProcessCard, // 카드 결제+팁 한번에 처리하는 함수
    handleCashPaymentConfirm,
    handleLogout,
    handleCancelPayment
  } = usePosLogic();

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-black text-white font-bold">Loading POS System...</div>;
  if (!currentEmployee) return <EmployeeLogin onLoginSuccess={setCurrentEmployee} />;

  const activeCategory = categories.find(c => c.id === selectedCategory);
  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory?.name);

  // 최종 금액 계산은 flowState에서 tipAmount를 가져옴
  const finalTotalAmount = getSubtotal() + flowState.tipAmount;

  return (
    <div className="flex h-screen bg-black overflow-hidden relative">
      <PosHeader employee={currentEmployee} onOpenOrders={() => dispatch({ type: 'SHOW_ORDER_LIST' })} onLogout={handleLogout} />

      <div className="w-1/3 h-full pt-12">
        <PosCart 
           cart={cart} 
           subtotal={getSubtotal()} 
           onRemoveItem={removeFromCart} 
           // ✨ [리팩토링] 결제 시작시 dispatch 호출
           onPaymentStart={(method) => dispatch({ type: 'START_PAYMENT', payload: { method } })}
           onEditNote={setEditingNoteItem} 
           onPhoneOrder={() => dispatch({ type: 'SHOW_PHONE_ORDER_MODAL' })}
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

      {/* ✨ [리팩토링] 모달 렌더링 조건을 flowState.flowStep으로 변경 */}
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
      
      {/* ✨ [리팩토링] 모든 모달이 dispatch를 사용하도록 변경 */}
      {flowState.flowStep === 'orderType' && <OrderTypeModal onSelect={(type) => dispatch({ type: 'SELECT_ORDER_TYPE', payload: { type }})} onCancel={() => dispatch({ type: 'RESET_FLOW' })} />}
      {flowState.flowStep === 'tableNum' && <TableNumberModal onConfirm={(num) => dispatch({ type: 'CONFIRM_TABLE_NUM', payload: { num }})} onCancel={() => dispatch({ type: 'RESET_FLOW' })} />}
      
      {flowState.flowStep === 'tip' && (
        <TipModal 
          subtotal={getSubtotal()} 
          onSelectTip={handleTipSelectAndProcessCard} // 카드는 팁 선택과 동시에 결제 시도
          onCancel={() => dispatch({ type: 'RESET_FLOW' })}
        />
      )}
      
      {flowState.flowStep === 'phoneOrder' && <CustomerNameModal onClose={() => dispatch({ type: 'RESET_FLOW' })} onConfirm={handlePhoneOrderConfirm} />}
      {flowState.flowStep === 'orderList' && <OrderListModal onClose={() => dispatch({ type: 'RESET_FLOW' })} onRecallOrder={handleRecallOrder} onRefundOrder={handleRefundOrder} />}

      <CashPaymentModal isOpen={flowState.flowStep === 'cash'} onClose={() => dispatch({ type: 'RESET_FLOW' })} totalAmount={finalTotalAmount} onConfirm={handleCashPaymentConfirm} />

      <CardPaymentModal
        isOpen={isCardProcessing} 
        statusMessage={cardStatusMessage} 
        onCancel={handleCancelPayment}
      />
    </div>
  );
}