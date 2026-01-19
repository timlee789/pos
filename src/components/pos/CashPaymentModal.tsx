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
  // ✨ [개선] 정수형 센트 단위로 관리 (예: 1250 -> $12.50)
  const [inputCents, setInputCents] = useState(0);

  useEffect(() => {
    if (isOpen) setInputCents(0);
  }, [isOpen]);

  // 값 계산
  const receivedAmount = inputCents / 100;
  const change = receivedAmount - totalAmount;
  const isSufficient = receivedAmount >= totalAmount;

  // ✨ [숫자 입력 로직 개선] 1 -> 2 -> 5 입력 시 $1.25가 됨 (POS 표준 방식)
  const handleNumClick = (num: number) => {
    if (inputCents > 1000000) return; // 너무 큰 금액 방지
    setInputCents((prev) => prev * 10 + num);
  };

  const handleBackspace = () => setInputCents((prev) => Math.floor(prev / 10));
  const handleClear = () => setInputCents(0);
  
  // 정확한 금액 (Exact)
  const handleExact = () => {
    setInputCents(Math.round(totalAmount * 100));
  };

  // ✨ [스마트 추천] 지폐 단위 추천 버튼 생성
  const getSmartTenders = () => {
    // 🔴 기존 (에러): const suggestions = [];
    // 🟢 수정: 숫자 배열임을 명시 (: number[])
    const suggestions: number[] = []; 
    
    const current = totalAmount;

    // 1. Next Dollar (예: 12.50 -> 13.00)
    if (current % 1 !== 0) {
        suggestions.push(Math.ceil(current));
    }
    // 2. $5, $10, $20, $50, $100 단위
    [5, 10, 20, 50, 100].forEach(bill => {
        if (bill > current) {
            // 이미 Next Dollar에 포함된 경우 중복 방지
            if (!suggestions.includes(bill)) suggestions.push(bill);
        }
    });

    // 최대 3~4개만 표시
    return suggestions.slice(0, 3);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-[900px] h-[600px] rounded-3xl shadow-2xl overflow-hidden flex"
        >
          
          {/* --- [Left] Amount Display Section --- */}
          <div className="w-[45%] bg-slate-50 p-8 flex flex-col justify-between border-r border-gray-200">
            <div>
                <h2 className="text-3xl font-extrabold text-slate-800 mb-8">Cash Payment</h2>
                
                <div className="mb-8 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Total Due</h3>
                    <div className="text-5xl font-black text-slate-900">
                        ${totalAmount.toFixed(2)}
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Tendered</h3>
                    <div className={`text-6xl font-black transition-colors border-b-4 pb-2 ${
                        receivedAmount > 0 ? 'text-blue-600 border-blue-600' : 'text-gray-300 border-gray-300'
                    }`}>
                        ${receivedAmount.toFixed(2)}
                    </div>
                </div>

                <div>
                    <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Change Due</h3>
                    <div className={`text-5xl font-black ${isSufficient ? 'text-green-600' : 'text-red-400'}`}>
                        ${isSufficient ? change.toFixed(2) : '0.00'}
                    </div>
                    {!isSufficient && receivedAmount > 0 && (
                        <p className="text-red-500 font-bold mt-2 animate-pulse">Insufficient Funds</p>
                    )}
                </div>
            </div>
            
            <button onClick={onClose} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-bold transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back to Order
            </button>
          </div>

          {/* --- [Right] Keypad Section --- */}
          <div className="w-[55%] p-6 bg-white flex flex-col">
            
            {/* 스마트 추천 버튼 영역 */}
            <div className="grid grid-cols-4 gap-3 mb-4 h-16">
                <button 
                    onClick={handleExact}
                    className="bg-blue-50 text-blue-700 font-bold rounded-xl border-2 border-blue-100 hover:bg-blue-100 active:scale-95 transition-all text-sm"
                >
                    Exact<br/>${totalAmount.toFixed(2)}
                </button>
                {getSmartTenders().map(amount => (
                    <button
                        key={amount}
                        onClick={() => setInputCents(amount * 100)}
                        className="bg-gray-50 text-gray-700 font-bold rounded-xl border-2 border-gray-100 hover:bg-gray-100 hover:border-gray-300 active:scale-95 transition-all text-lg"
                    >
                        ${amount}
                    </button>
                ))}
            </div>

            {/* 숫자 키패드 */}
            <div className="flex-1 grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumClick(num)}
                  className="rounded-2xl bg-white border border-gray-200 text-4xl font-bold text-slate-700 shadow-[0_4px_0_0_rgba(0,0,0,0.05)] hover:bg-gray-50 active:shadow-none active:translate-y-[2px] transition-all"
                >
                  {num}
                </button>
              ))}
              
              <button 
                onClick={handleClear} 
                className="rounded-2xl bg-red-50 border border-red-100 text-xl font-bold text-red-500 hover:bg-red-100 active:scale-95 transition-all"
              >
                Clear
              </button>
              
              <button 
                onClick={() => handleNumClick(0)} 
                className="rounded-2xl bg-white border border-gray-200 text-4xl font-bold text-slate-700 shadow-[0_4px_0_0_rgba(0,0,0,0.05)] hover:bg-gray-50 active:shadow-none active:translate-y-[2px] transition-all"
              >
                0
              </button>
              
              <button 
                onClick={handleBackspace} 
                className="rounded-2xl bg-gray-100 border border-gray-200 text-slate-600 hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
                </svg>
              </button>
            </div>

            {/* 결제 버튼 */}
            <button 
              onClick={() => isSufficient && onConfirm(receivedAmount, change)}
              disabled={!isSufficient}
              className={`w-full py-5 rounded-2xl text-2xl font-black shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3
                ${isSufficient 
                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-200' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              <span>PAY CASH</span>
              {isSufficient && <span className="text-3xl">➔</span>}
            </button>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}