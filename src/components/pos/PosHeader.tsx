'use client';

import React, { useState } from 'react';
import ClosingReportModal from './ClosingReportModal';

interface Employee {
  id: number;
  name: string;
  role: string;
}

interface PosHeaderProps {
  employee: Employee;
  onOpenOrders: () => void;
  onLogout: () => void;
}

export default function PosHeader({ employee, onOpenOrders, onLogout }: PosHeaderProps) {
  const [showClosingModal, setShowClosingModal] = useState(false);

  return (
    <>
      {/* 상단 우측 버튼 그룹: top-2로 살짝 올리고, gap-6은 유지 */}
      <div className="absolute top-1 right-6 z-50 flex items-center gap-6">
          
          {/* 1. ORDERS 버튼 */}
          <button 
             onClick={onOpenOrders}
             className="px-6 py-2 rounded-xl text-lg font-black shadow-lg transition-all border bg-blue-600 text-white border-blue-500 hover:bg-blue-500 hover:scale-105 flex items-center gap-2"
          >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
               <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
             </svg>
             ORDERS
          </button>

          {/* 2. 직원 배지 */}
          <div className="bg-gray-800/90 backdrop-blur-sm px-6 py-2 rounded-xl shadow-lg border border-gray-600 flex items-center gap-2">
              <span className="text-gray-400 font-medium text-base">Staff:</span>
              <span className="text-lg font-black text-white">{employee.name}</span>
          </div>

          {/* 3. CLOSING 버튼 */}
          <button 
            onClick={() => setShowClosingModal(true)} 
            className="px-6 py-2 rounded-xl text-lg font-black bg-gray-700 text-white border-2 border-gray-600 hover:bg-gray-600 hover:border-gray-500 shadow-lg hover:scale-105 transition-all"
          >
             CLOSING
          </button>

          {/* 4. LOGOUT 버튼 */}
          <button 
            onClick={onLogout} 
            className="px-6 py-2 rounded-xl text-lg font-black bg-red-600 text-white border-2 border-red-500 hover:bg-red-500 hover:scale-105 shadow-lg transition-all"
          >
            LOGOUT
          </button>
      </div>

      {/* 모달 렌더링 */}
      {showClosingModal && (
        <ClosingReportModal 
          employeeName={employee.name} 
          onClose={() => setShowClosingModal(false)} 
        />
      )}
    </>
  );
}