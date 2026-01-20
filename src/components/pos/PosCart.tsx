'use client';

import { CartItem } from '@/lib/types';
import { useRef, useEffect } from 'react';

interface PosCartProps {
  cart: CartItem[];
  subtotal: number;
  onRemoveItem: (uniqueCartId: string) => void;
  onPaymentStart: (method: 'CASH' | 'CARD') => void;
  onEditNote: (item: CartItem) => void; 
}

export default function PosCart({
  cart,
  subtotal,
  onRemoveItem,
  onPaymentStart,
  onEditNote
}: PosCartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [cart]);

  return (
    // ✨ [다크모드] 배경 bg-gray-900, 테두리 border-gray-800
    <section className="flex flex-col bg-gray-900 border-r border-gray-800 shadow-2xl h-full z-20">
      
      {/* 헤더 */}
      <div className="p-5 bg-black text-white flex justify-between items-center shrink-0 border-b border-gray-800">
        <h1 className="text-2xl font-black tracking-wide text-blue-500">ORDER LIST</h1>
        <span className="text-lg text-gray-400 font-bold">{cart.length} ITEMS</span>
      </div>

      {/* 장바구니 리스트 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-black" ref={scrollRef}>
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-60">
             <span className="text-7xl mb-4">🛒</span>
             <p className="text-2xl font-bold">Cart is empty</p>
          </div>
        ) : (
          cart.map((item) => (
            // ✨ [다크모드] 아이템 카드 bg-gray-900, 글씨 흰색
            <div key={item.uniqueCartId} className="flex flex-col p-5 bg-gray-900 rounded-2xl border border-gray-800 shadow-sm relative">
              
              <div className="flex justify-between items-start mb-2">
                <span className="font-black text-2xl text-white leading-tight w-[70%]">
                    {item.posName || item.name}
                </span>
                <span className="font-black text-2xl text-blue-400">
                  ${(item.totalPrice * item.quantity).toFixed(2)}
                </span>
              </div>
              
              <div className="text-xl text-gray-400 font-bold pl-1 mb-3">
                {item.selectedModifiers && item.selectedModifiers.length > 0 
                  ? item.selectedModifiers.map(m => `+ ${m.name}`).join(', ')
                  : <span className="text-gray-600 text-lg font-normal">Basic</span>}
              </div>

              {item.notes && (
                <div className="mb-4 bg-yellow-900/30 text-yellow-500 text-lg font-bold p-3 rounded-xl border border-yellow-800/50 flex items-start gap-2 shadow-sm">
                   <span className="text-xl">📝</span>
                   <span>{item.notes}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-1 pt-3 border-t border-gray-800">
                <button 
                  onClick={() => onEditNote(item)}
                  className="bg-gray-800 border border-gray-700 text-gray-300 px-5 py-3 rounded-xl hover:bg-gray-700 hover:text-white font-bold shadow-sm flex items-center gap-2 text-lg active:scale-95 transition-all"
                >
                  {item.notes ? 'Edit Note' : '+ Note'}
                </button>

                <button 
                  onClick={() => onRemoveItem(item.uniqueCartId)}
                  className="bg-gray-800 border border-red-900/50 text-red-400 px-5 py-3 rounded-xl hover:bg-red-900/20 hover:text-red-300 font-bold shadow-sm text-lg active:scale-95 transition-all"
                >
                  Delete 🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 하단 결제 버튼 */}
      <div className="p-5 bg-gray-900 border-t border-gray-800 shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between mb-4 items-end">
          <span className="text-xl font-bold text-gray-400">Total Amount</span>
          <span className="text-5xl font-black text-white">${subtotal.toFixed(2)}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 h-24">
          <button 
            onClick={() => onPaymentStart('CASH')}
            className="bg-green-700 hover:bg-green-600 text-white rounded-2xl text-3xl font-black flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform border border-green-600"
          >
            💵 CASH
          </button>
          <button 
            onClick={() => onPaymentStart('CARD')}
            className="bg-blue-700 hover:bg-blue-600 text-white rounded-2xl text-3xl font-black flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform border border-blue-600"
          >
            💳 CARD
          </button>
        </div>
      </div>
    </section>
  );
}