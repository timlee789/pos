import { useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onConfirm: (tableNum: string) => void;
  onCancel: () => void;
}

export default function TableNumberModal({ onConfirm, onCancel }: Props) {
  const [tableNum, setTableNum] = useState('');

  const handleNumClick = (num: string) => {
    if (tableNum.length < 3) {
      setTableNum(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setTableNum(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        // ✨ [수정] 
        // 1. 너비 대폭 확대: max-w-lg -> max-w-2xl (가로로 넓게)
        // 2. 패딩 확대: p-8 -> p-10 (여유롭게)
        // 3. 둥글기: rounded-[3rem] (더 부드럽게)
        className="bg-gray-900 w-full max-w-2xl p-10 rounded-[3rem] shadow-2xl flex flex-col items-center border border-gray-700 relative"
      >
        {/* 헤더 */}
        <h2 className="text-5xl font-black text-white mb-6 tracking-wide">Table Service</h2>
        
        {/* 안내 문구 박스 */}
        <div className="bg-gray-800/50 border-2 border-gray-700 rounded-3xl p-6 mb-10 w-full text-center">
            <p className="text-gray-200 font-bold text-3xl leading-tight">
               Please grab a <span className="text-red-500">Number Stand</span>
            </p>
            <p className="text-gray-400 text-xl mt-3 font-medium">
               on the table and enter the number below.
            </p>
        </div>

        {/* 입력 화면 표시창 */}
        <div className="w-full h-28 bg-gray-800 rounded-3xl flex items-center justify-center mb-10 border-4 border-gray-700 shadow-inner">
          <span className={`text-7xl font-black tracking-[0.5em] ${tableNum ? 'text-white' : 'text-gray-600'}`}>
            {tableNum || "-"}
          </span>
        </div>

        {/* ✨ [수정] 키패드 영역: gap-4 -> gap-6 (버튼 사이 간격 넓힘) */}
        <div className="grid grid-cols-3 gap-6 w-full mb-10">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumClick(num.toString())}
              // 버튼 스타일: h-24 유지, 텍스트 크기 유지
              className="h-24 rounded-3xl bg-gray-800 border-2 border-gray-700 text-5xl font-bold text-white hover:bg-gray-700 hover:border-gray-500 active:bg-gray-600 transition-all shadow-lg active:scale-95"
            >
              {num}
            </button>
          ))}
          
          <div /> {/* 빈 공간 */}
          
          <button
            onClick={() => handleNumClick('0')}
            className="h-24 rounded-3xl bg-gray-800 border-2 border-gray-700 text-5xl font-bold text-white hover:bg-gray-700 hover:border-gray-500 active:bg-gray-600 transition-all shadow-lg active:scale-95"
          >
            0
          </button>

          <button
            onClick={handleDelete}
            className="h-24 rounded-3xl bg-red-900/30 border-2 border-red-900/50 text-red-400 flex items-center justify-center hover:bg-red-900/50 hover:border-red-500 hover:text-red-300 active:bg-red-900/70 transition-all shadow-lg active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-12 h-12">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
            </svg>
          </button>
        </div>

        {/* 하단 액션 버튼 */}
        <div className="flex gap-6 w-full">
          <button
            onClick={onCancel}
            className="flex-1 h-24 bg-gray-700 text-gray-300 text-3xl font-bold rounded-3xl border-2 border-gray-600 hover:bg-gray-600 hover:text-white hover:border-gray-500 transition-all active:scale-95 shadow-xl"
          >
            Cancel
          </button>
          <button
            onClick={() => tableNum && onConfirm(tableNum)}
            disabled={!tableNum}
            className="flex-[2] h-24 bg-red-600 text-white text-3xl font-black rounded-3xl border-2 border-red-500 hover:bg-red-500 shadow-xl shadow-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
}