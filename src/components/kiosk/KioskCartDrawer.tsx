'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CartItem } from '@/lib/types';
// ✨ [중요] React에서 RefObject를 import 해야 합니다.
import { RefObject } from 'react';

// ExtendedCartItem 타입 정의 (또는 types.ts에서 가져오기)
interface ExtendedCartItem extends CartItem {
    uniqueCartId: string;
    groupId?: string;
}

interface KioskCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: ExtendedCartItem[];
  onRemove: (id: string) => void;
  // ✨ [해결] 여기서 cartEndRef 타입을 정확히 정의해야 에러가 사라집니다.
  cartEndRef: RefObject<HTMLDivElement | null>; 
  totals: { subtotal: number; tax: number; cardFee: number; grandTotal: number };
  onPayNow: () => void;
  onClear: () => void;
}

export default function KioskCartDrawer({ 
  isOpen, onClose, cart, onRemove, cartEndRef, totals, onPayNow, onClear 
}: KioskCartDrawerProps) {
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 1. 배경 (Backdrop) */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
          />
          
          {/* 2. 슬라이드 패널 (Drawer) */}
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 w-full h-[85%] md:h-[75%] bg-white z-[60] shadow-2xl flex flex-col rounded-t-[2.5rem]"
            onClick={(e) => e.stopPropagation()} 
          >
            {/* 헤더 */}
            <div className="p-6 md:p-8 bg-gray-900 text-white shadow-md flex justify-between items-center shrink-0 rounded-t-[2.5rem]">
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Your Order</h2>
                <p className="text-gray-400 text-lg md:text-xl mt-1 font-medium">{cart.length} items</p>
              </div>
              <button 
                onClick={onClose} 
                className="bg-gray-800 p-4 rounded-full hover:bg-gray-700 transition-colors shadow-lg active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8 md:w-10 md:h-10 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 장바구니 리스트 */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-24 h-24 opacity-20">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                   </svg>
                  <p className="text-2xl font-bold">Cart is empty.</p>
                  <button onClick={onClose} className="text-blue-500 font-bold text-lg mt-2">Go back to Menu</button>
                </div>
              ) : (
                <>
                  <AnimatePresence initial={false} mode='popLayout'>
                    {cart.map((cartItem) => (
                      <motion.div 
                        key={cartItem.uniqueCartId} layout 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} 
                        className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-200 flex flex-row gap-4 relative z-0"
                      >
                          <div className="flex-1 flex flex-col justify-center">
                            <h4 className="font-black text-2xl md:text-3xl text-gray-900 leading-tight mb-1">{cartItem.name}</h4>
                            
                            {cartItem.selectedModifiers.length > 0 && (
                              <div className="my-2 text-lg md:text-xl text-gray-600 font-medium bg-gray-100/80 p-3 rounded-xl inline-block">
                                {cartItem.selectedModifiers.map((opt, i) => (
                                  <div key={i} className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full inline-block mr-1"></span>
                                    <span>{opt.name}</span>
                                    {opt.price > 0 && <span className="text-gray-900 font-bold ml-1">(+${opt.price.toFixed(2)})</span>}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="mt-2 font-black text-gray-900 text-3xl tracking-tight">
                              ${cartItem.totalPrice.toFixed(2)}
                            </div>
                          </div>

                          <div className="flex flex-col justify-center border-l pl-5 border-gray-100">
                            <button 
                              onClick={() => onRemove(cartItem.uniqueCartId)} 
                              className="w-16 h-16 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {/* ✨ [해결] 스크롤 하단 앵커 (ref 연결) */}
                  <div ref={cartEndRef} />
                  
                  <div className="text-right pt-4 pb-4">
                    <button 
                      onClick={onClear} 
                      className="text-xl text-red-500 hover:text-red-700 font-bold px-4 py-2 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      Empty Cart
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* 하단 결제 정보 및 버튼 */}
            {cart.length > 0 && (
              <div className="p-6 md:p-8 border-t bg-white shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] shrink-0 pb-10">
                <div className="space-y-3 mb-8 text-gray-500 font-bold text-xl md:text-2xl">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-gray-800">${totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (7%)</span>
                    <span className="text-gray-800">${totals.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span>Card Fee (3%)</span>
                    <span>${totals.cardFee.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mb-8 pt-6 border-t border-gray-100">
                  <span className="text-4xl font-black text-gray-900">Total</span>
                  <span className="text-6xl font-black text-red-600 tracking-tighter">${totals.grandTotal.toFixed(2)}</span>
                </div>
                
                <button 
                  className="w-full h-28 bg-green-600 text-white text-5xl font-black rounded-3xl hover:bg-green-700 shadow-xl shadow-green-900/20 active:scale-95 transition-all flex items-center justify-center gap-4"
                  onClick={onPayNow}
                >
                  <span>CHECKOUT</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-12 h-12">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}