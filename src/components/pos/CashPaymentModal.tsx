'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CashPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirm: (receivedAmount: number, change: number) => void;
}

export default function CashPaymentModal({
  isOpen,
  onClose,
  totalAmount,
  onConfirm,
}: CashPaymentModalProps) {
  const [inputStr, setInputStr] = useState('');

  useEffect(() => {
    if (isOpen) setInputStr('');
  }, [isOpen]);

  // 달러 계산이므로 소수점(센트) 고려 (여기서는 단순화를 위해 입력은 정수나 소수점 입력 가능하게 처리할 수 있으나, 보통 POS 키패드는 센트 단위 입력이 복잡하므로 정수 입력 후 소수점 처리를 하거나, 일단 정수 입력만 받습니다)
  // 미국 POS는 보통 1200 입력시 $12.00이 되는 방식 또는 12 입력시 $12.00. 
  // 여기서는 기존 로직대로 '숫자 그대로' 입력받되, 표기를 $로 바꿉니다.
  const receivedAmount = parseFloat(inputStr || '0');
  const change = receivedAmount - totalAmount;
  const isSufficient = receivedAmount >= totalAmount;

  const handleNumClick = (num: string) => {
    if (inputStr.length > 8) return;
    setInputStr((prev) => prev + num);
  };

  const handleBackspace = () => setInputStr((prev) => prev.slice(0, -1));
  const handleClear = () => setInputStr('');
  
  const handleExact = () => {
    setInputStr(totalAmount.toString());
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-[900px] h-[600px] rounded-3xl shadow-2xl overflow-hidden flex"
        >
          
          {/* --- [Left] Amount Display Section --- */}
          <div className="w-[40%] bg-slate-50 p-8 flex flex-col justify-center border-r border-gray-200">
            
            <div className="mb-10">
              <h3 className="text-gray-500 text-xl font-bold uppercase tracking-wider mb-2">Total Due</h3>
              {/* ✨ [수정] $ 표기 */}
              <div className="text-5xl font-black text-slate-800">
                ${totalAmount.toFixed(2)}
              </div>
            </div>

            <div className="mb-10">
              <h3 className="text-gray-500 text-xl font-bold uppercase tracking-wider mb-2">Tendered</h3>
              <div className={`text-5xl font-black border-b-4 pb-2 transition-colors ${
                 receivedAmount > 0 ? 'text-blue-600 border-blue-600' : 'text-gray-300 border-gray-200'
              }`}>
                {/* ✨ [수정] $ 표기 */}
                ${receivedAmount > 0 ? receivedAmount.toLocaleString() : '0.00'}
              </div>
            </div>

            <div>
              <h3 className="text-gray-500 text-xl font-bold uppercase tracking-wider mb-2">Change</h3>
              <div className={`text-5xl font-black ${isSufficient ? 'text-green-600' : 'text-red-400'}`}>
                {/* ✨ [수정] $ 표기 */}
                ${isSufficient ? change.toFixed(2) : '0.00'}
              </div>
              {!isSufficient && receivedAmount > 0 && (
                <p className="text-red-500 font-bold mt-2">Insufficient Funds</p>
              )}
            </div>

          </div>

          {/* --- [Right] Keypad Section --- */}
          <div className="w-[60%] p-8 bg-white flex flex-col">
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-extrabold text-slate-800">Cash Payment</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 grid grid-cols-3 gap-4 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumClick(num.toString())}
                  className="rounded-2xl bg-white border-2 border-gray-100 text-4xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 transition-all shadow-sm"
                >
                  {num}
                </button>
              ))}
              
              <button onClick={handleClear} className="rounded-2xl bg-orange-50 border-2 border-orange-100 text-2xl font-bold text-orange-600 hover:bg-orange-100">
                Clear
              </button>
              
              <button onClick={() => handleNumClick('0')} className="rounded-2xl bg-white border-2 border-gray-100 text-4xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300">
                0
              </button>
              
              {/* ✨ 소수점 입력이 필요하면 여기에 '.' 버튼 추가 가능. 현재는 00 유지 */}
              <button onClick={() => handleNumClick('00')} className="rounded-2xl bg-white border-2 border-gray-100 text-3xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300">
                00
              </button>
            </div>

            <div className="flex gap-4 h-24">
              <button 
                onClick={handleExact}
                className="flex-1 bg-gray-200 text-gray-700 text-2xl font-bold rounded-2xl hover:bg-gray-300 transition-colors flex flex-col items-center justify-center"
              >
                <span>Exact</span>
                <span className="text-sm opacity-60">No Change</span>
              </button>

              <button 
                onClick={() => isSufficient && onConfirm(receivedAmount, change)}
                disabled={!isSufficient}
                className={`flex-[2] text-3xl font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3
                  ${isSufficient 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl hover:scale-[1.02]' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                <span>Pay</span>
                {isSufficient && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}