'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface CardPaymentModalProps {
  isOpen: boolean;
  statusMessage: string;
  onCancel: () => void; // 취소 버튼 누르면 실행될 함수
}

export default function CardPaymentModal({
  isOpen,
  statusMessage,
  onCancel,
}: CardPaymentModalProps) {
  
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white w-[500px] p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center"
        >
          {/* 1. 로딩 애니메이션 (빙글빙글) */}
          <div className="mb-6 relative">
            <div className="w-20 h-20 border-4 border-gray-200 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-blue-600 rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
          </div>

          {/* 2. 상태 메시지 (예: Please Insert Card...) */}
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Card Payment</h2>
          <p className="text-lg text-gray-600 font-medium mb-8 whitespace-pre-wrap">
            {statusMessage}
          </p>

          {/* 3. ✨ [취소 버튼] 이게 필요했던 겁니다! */}
          <button 
            onClick={onCancel}
            className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel Transaction
          </button>
          
          <p className="mt-4 text-xs text-gray-400">
            Pressing cancel will reset the terminal.
          </p>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}