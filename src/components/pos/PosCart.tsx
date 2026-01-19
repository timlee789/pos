'use client';

import { CartItem } from '@/lib/types';
import { useRef, useEffect } from 'react';

interface PosCartProps {
  cart: CartItem[];
  subtotal: number;
  onRemoveItem: (uniqueCartId: string) => void;
  onPaymentStart: (method: 'CASH' | 'CARD') => void;
  // ✨ [추가] 메모 수정을 위한 핸들러
  onEditNote: (item: CartItem) => void; 
}

export default function PosCart({
  cart,
  subtotal,
  onRemoveItem,
  onPaymentStart,
  onEditNote
}: PosCartProps) {
  // 스크롤 자동 이동을 위한 Ref (선택 사항이지만 UX상 좋음)
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [cart]);

  return (
    <section className="flex flex-col bg-white border-r shadow-lg h-full">
      {/* 헤더 */}
      <div className="p-4 bg-slate-800 text-white flex justify-between items-center shrink-0">
        <h1 className="text-xl font-bold">POS System</h1>
        <span className="text-sm text-gray-300">{new Date().toLocaleDateString()}</span>
      </div>

      {/* 장바구니 리스트 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2" ref={scrollRef}>
        {cart.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-xl font-medium">
            Order is empty
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.uniqueCartId} className="flex flex-col p-4 bg-blue-50 rounded-xl border border-blue-100 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-xl leading-snug w-[80%]">{item.posName || item.name}</span>
                <span className="font-bold text-xl text-blue-800">
                  ${(item.totalPrice * item.quantity).toFixed(2)}
                </span>
              </div>
              
              {/* 옵션 표시 */}
              <div className="text-lg text-gray-600 font-medium pl-2 mb-2">
                {item.selectedModifiers && item.selectedModifiers.length > 0 
                  ? item.selectedModifiers.map(m => `+ ${m.name}`).join(', ')
                  : <span className="text-gray-400 text-base">Basic</span>}
              </div>

              {/* ✨ [추가] 메모 표시 영역 (데이터가 있을 때만 보임) */}
              {item.notes && (
                <div className="mb-3 bg-yellow-100 text-yellow-900 text-base font-bold p-2 rounded-lg border border-yellow-200 flex items-start gap-2 shadow-sm">
                   <span>📝</span>
                   <span>{item.notes}</span>
                </div>
              )}

              {/* 버튼 영역 */}
              <div className="flex justify-end gap-2 mt-1">
                {/* ✨ [추가] 메모 버튼 */}
                <button 
                  onClick={() => onEditNote(item)}
                  className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 font-bold shadow-sm flex items-center gap-1"
                >
                  {item.notes ? 'Edit Note' : '+ Note'}
                </button>

                <button 
                  onClick={() => onRemoveItem(item.uniqueCartId)}
                  className="bg-white border border-red-200 text-red-500 px-4 py-2 rounded-lg hover:bg-red-50 font-bold shadow-sm"
                >
                  Delete 🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 하단 결제 버튼 */}
      <div className="p-4 bg-gray-50 border-t shrink-0">
        <div className="flex justify-between mb-4 text-3xl font-bold text-blue-900">
          <span>Total</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3 h-20">
          <button 
            onClick={() => onPaymentStart('CASH')}
            className="bg-green-600 hover:bg-green-700 text-white rounded-xl text-2xl font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform"
          >
            💵 Cash
          </button>
          <button 
            onClick={() => onPaymentStart('CARD')}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-2xl font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform"
          >
            💳 Card
          </button>
        </div>
      </div>
    </section>
  );
}