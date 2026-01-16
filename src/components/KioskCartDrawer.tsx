import { motion, AnimatePresence } from 'framer-motion';
import { RefObject } from 'react'; // ✨ [수정] RefObject를 직접 import
import { ExtendedCartItem } from '@/lib/types'; // ✨ [수정] 이제 types.ts에서 불러옴

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cart: ExtendedCartItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onPay: () => void;
  totals: { subtotal: number; tax: number; cardFee: number; grandTotal: number };
  // ✨ [수정] React.RefObject 대신 RefObject 사용 (import 했으므로)
  // ✨ [수정] 아래 줄을 이렇게 바꿔주세요! (| null 추가)
  cartEndRef: RefObject<HTMLDivElement | null>;
}

export default function KioskCartDrawer({ isOpen, onClose, cart, onRemove, onClear, onPay, totals, cartEndRef }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 w-full h-[70%] bg-white z-[60] shadow-2xl flex flex-col rounded-t-[2rem]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="p-6 bg-gray-900 text-white shadow-md flex justify-between items-center shrink-0 rounded-t-[2rem]">
              <div>
                <h2 className="text-3xl font-extrabold">Your Order</h2>
                <p className="text-gray-300 text-lg mt-1">{cart.length} items</p>
              </div>
              <button onClick={onClose} className="bg-red-600 p-3 rounded-full hover:bg-red-500 transition-colors shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* 리스트 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                  <p className="text-2xl font-bold">Cart is empty.</p>
                </div>
              ) : (
                <>
                  <AnimatePresence initial={false} mode='popLayout'>
                    {cart.map((cartItem) => (
                      <motion.div
                        key={cartItem.uniqueCartId} layout
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-row gap-4 relative z-0"
                      >
                        <div className="flex-1 flex flex-col justify-center">
                          <h4 className="font-extrabold text-3xl text-gray-900 leading-tight">{cartItem.name}</h4>
                          {cartItem.selectedModifiers.length > 0 && (
                            <div className="mt-3 text-xl text-gray-600 font-medium bg-gray-50 p-3 rounded-xl">
                              {cartItem.selectedModifiers.map((opt, i) => (
                                <span key={i} className="block">+ {opt.name} {opt.price > 0 && `($${opt.price.toFixed(2)})`}</span>
                              ))}
                            </div>
                          )}
                          <div className="mt-4 font-black text-gray-900 text-3xl">${cartItem.totalPrice.toFixed(2)}</div>
                        </div>
                        <div className="flex flex-col justify-center border-l pl-5 border-gray-100">
                          <button onClick={() => onRemove(cartItem.uniqueCartId)} className="w-16 h-16 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={cartEndRef} />
                  <div className="text-right pt-2"><button onClick={onClear} className="text-xl text-red-500 hover:text-red-700 underline font-semibold">Clear All Items</button></div>
                </>
              )}
            </div>

            {/* 결제 정보 */}
            {cart.length > 0 && (
              <div className="p-8 border-t bg-gray-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0">
                <div className="space-y-3 mb-6 text-gray-600 font-medium text-xl">
                  <div className="flex justify-between"><span>Subtotal</span><span>${totals.subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-lg"><span>Tax (7%)</span><span>${totals.tax.toFixed(2)}</span></div>
                  <div className="flex justify-between text-lg"><span>Fee (3%)</span><span>${totals.cardFee.toFixed(2)}</span></div>
                </div>
                <div className="flex justify-between items-center mb-6 pt-6 border-t border-gray-200">
                  <span className="text-3xl font-bold text-gray-800">Total</span>
                  <span className="text-5xl font-black text-red-600">${totals.grandTotal.toFixed(2)}</span>
                </div>
                {/* ✨ Pay Now 버튼: Hook에서 전달받은 onPay 함수 실행 */}
                <button className="w-full h-24 bg-green-600 text-white text-4xl font-black rounded-3xl hover:bg-green-700 shadow-xl active:scale-95 transition-all" onClick={onPay}>Pay Now</button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}