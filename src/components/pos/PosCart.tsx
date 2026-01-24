'use client';

import { CartItem } from '@/lib/types';

interface PosCartProps {
  cart: CartItem[];
  subtotal: number;
  onRemoveItem: (uniqueId: string) => void;
  onPaymentStart: (method: 'CASH' | 'CARD') => void;
  onEditNote: (item: CartItem) => void;
  onPhoneOrder: () => void;
}

export default function PosCart({ 
  cart, 
  subtotal, 
  onRemoveItem, 
  onPaymentStart, 
  onEditNote,
  onPhoneOrder
}: PosCartProps) {

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-800 shadow-2xl">
      {/* 1. 헤더 */}
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center shrink-0">
        <h2 className="text-2xl font-black text-white">Current Order</h2>
        <span className="bg-blue-600 text-white text-lg font-bold px-4 py-1 rounded-full">
          {cart.reduce((acc, item) => acc + item.quantity, 0)} Items
        </span>
      </div>

      {/* 2. 장바구니 리스트 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <p className="text-2xl font-bold">Cart is empty</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.uniqueCartId} className="bg-gray-800 rounded-2xl p-5 border border-gray-700 shadow-sm relative group">
              <div className="flex justify-between items-start mb-2">
                 <h3 className="text-3xl font-black text-white w-[70%] leading-tight tracking-tight">
                    {item.name}
                 </h3>
                 <span className="text-3xl font-black text-white">
                    ${item.totalPrice.toFixed(2)}
                 </span>
              </div>

              {item.selectedModifiers.length > 0 && (
                <div className="text-xl text-gray-300 mt-2 pl-3 border-l-4 border-gray-600 space-y-1 font-medium">
                   {item.selectedModifiers.map((mod, idx) => (
                      <p key={idx}>+ {mod.name} (${mod.price.toFixed(2)})</p>
                   ))}
                </div>
              )}

              {item.notes && (
                <div onClick={() => onEditNote(item)} className="mt-3 text-lg text-yellow-400 bg-yellow-900/20 px-3 py-2 rounded-lg border border-yellow-700/50 cursor-pointer hover:bg-yellow-900/40 font-semibold">
                  📝 {item.notes}
                </div>
              )}

              {/* ✨ [수정] 버튼 크기 대폭 확대 (h-16, text-xl) */}
              <div className="grid grid-cols-2 gap-8 mt-4">
                  <button 
                    onClick={() => onEditNote(item)} 
                    className="h-16 text-xl bg-gray-700 text-gray-200 rounded-xl hover:bg-gray-600 font-bold border-2 border-gray-600 flex items-center justify-center"
                  >
                    ✏️ Edit Note
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRemoveItem(item.uniqueCartId); }} 
                    className="h-16 text-xl bg-red-900/40 text-red-400 rounded-xl border-2 border-red-900 hover:bg-red-600 hover:text-white transition-colors font-bold flex items-center justify-center"
                  >
                    🗑️ Remove
                  </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 3. 하단 버튼 영역 */}
      <div className="p-4 bg-gray-800 border-t border-gray-700 shrink-0 shadow-[0_-5px_15px_rgba(0,0,0,0.3)] z-10">
        
        <div className="flex justify-between items-end mb-4 px-1">
          <span className="text-gray-400 text-xl font-bold">Total</span>
          <span className="text-5xl text-white font-black tracking-tight">${subtotal.toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            onClick={onPhoneOrder}
            className="col-span-2 bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-2xl text-2xl font-black shadow-lg shadow-purple-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            PHONE ORDER
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onPaymentStart('CASH')} className="bg-green-600 hover:bg-green-500 text-white py-5 rounded-2xl text-2xl font-black shadow-lg shadow-green-900/20 active:scale-95 transition-all flex flex-col items-center justify-center leading-none">
            <span className="text-sm font-bold opacity-80 mb-1">PAY WITH</span> CASH
          </button>
          <button onClick={() => onPaymentStart('CARD')} className="bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl text-2xl font-black shadow-lg shadow-blue-900/20 active:scale-95 transition-all flex flex-col items-center justify-center leading-none">
            <span className="text-sm font-bold opacity-80 mb-1">PAY WITH</span> CARD
          </button>
        </div>
      </div>
    </div>
  );
}