import { CartItem } from '@/lib/types';

interface Props {
  cart: CartItem[];
  subtotal: number;
  onRemoveItem: (id: string) => void;
  onPaymentStart: (method: 'CASH' | 'CARD') => void;
  onEditNote: (item: CartItem) => void;
  onPhoneOrder: () => void;
}

export default function PosCart({ cart, subtotal, onRemoveItem, onPaymentStart, onEditNote, onPhoneOrder }: Props) {
  
  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-800 text-white">
      
      {/* 1. 카트 헤더 (버튼 제거됨) */}
      <div className="flex-none p-4 border-b border-gray-800 bg-gray-800 shadow-md flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          🛒 Orders
          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">{cart.length}</span>
        </h2>
        {/* 상단 버튼 제거됨 */}
      </div>

      {/* 2. 주문 아이템 리스트 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
            <p className="text-xl font-medium">Cart is empty</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.uniqueCartId} className="bg-gray-800 rounded-xl p-4 relative hover:bg-gray-750 border border-gray-700 shadow-sm transition-colors">
              
              <div className="flex justify-between items-start mb-2">
                 <div className="pr-2">
                    <span className="text-2xl font-black text-white block leading-tight">{item.name}</span>
                    {item.name.startsWith('(Set)') && (
                       <span className="inline-block mt-1 text-xs text-green-400 border border-green-600 px-1.5 py-0.5 rounded font-bold">SET ITEM</span>
                    )}
                 </div>
                 <span className="font-mono font-bold text-2xl text-white shrink-0">${item.totalPrice.toFixed(2)}</span>
              </div>

              {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                  <div className="mt-2 mb-3 pl-3 border-l-4 border-yellow-500 bg-black/40 py-2 rounded-r pr-3">
                      {item.selectedModifiers.map((mod, idx) => (
                          <div key={idx} className="flex justify-between items-center py-0.5">
                              <span className="text-yellow-400 font-bold text-lg">- {mod.name}</span>
                              {mod.price > 0 && (
                                <span className="text-gray-300 text-base bg-gray-700 px-2 py-0.5 rounded ml-2">
                                  +${mod.price.toFixed(2)}
                                </span>
                              )}
                          </div>
                      ))}
                  </div>
              )}

              {item.notes && (
                 <div className="text-blue-300 text-base italic pl-3 border-l-4 border-blue-500 mb-3 bg-blue-900/20 py-1.5 rounded-r font-medium">
                    📝 {item.notes}
                 </div>
              )}

              <div className="flex gap-3 mt-2 pt-3 border-t border-gray-700">
                 <button onClick={() => onEditNote(item)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-sm py-3 rounded-lg text-gray-200 font-bold transition-colors">
                    {item.notes ? 'Edit Note' : 'Add Note'}
                 </button>
                 <button onClick={() => onRemoveItem(item.uniqueCartId)} className="flex-1 bg-red-900/40 hover:bg-red-800 text-red-200 text-sm py-3 rounded-lg font-bold transition-colors">
                    Remove
                 </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 3. 하단 결제 버튼 영역 (여기에 Phone Order 추가) */}
      <div className="flex-none p-4 bg-gray-800 border-t border-gray-700 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.3)]">
        <div className="flex justify-between items-end mb-4">
           <span className="text-gray-400 text-base uppercase font-bold tracking-wider">Total Due</span>
           <span className="text-5xl font-black text-green-400 tracking-tight">${subtotal.toFixed(2)}</span>
        </div>
        
        <div className="flex flex-col gap-3">
           {/* ✨✨ Phone Order 버튼 (Card/Cash 위에 배치) */}
           <button 
              onClick={onPhoneOrder}
              disabled={cart.length === 0}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xl py-4 flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg active:scale-95 transition-all"
           >
              <span>📞</span> Phone Order
           </button>

           <div className="grid grid-cols-2 gap-4 h-20">
              <button 
                 onClick={() => onPaymentStart('CASH')}
                 disabled={cart.length === 0}
                 className="bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-2xl flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg active:scale-95 transition-all"
              >
                 <span>💵</span> CASH
              </button>
              <button 
                 onClick={() => onPaymentStart('CARD')}
                 disabled={cart.length === 0}
                 className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-2xl flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg active:scale-95 transition-all"
              >
                 <span>💳</span> CARD
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}