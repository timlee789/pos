'use client';

import { useState, useEffect } from 'react';

// 데이터 타입 정의
interface ClosingData {
  date: string;
  employeeName: string;
  cashTotal: number;
  cardTotal: number;
  tipTotal: number;
  grandTotal: number;
  orderCount: number;
}

interface Props {
  employeeName: string;
  onClose: () => void;
}

export default function ClosingReportModal({ employeeName, onClose }: Props) {
  // 오늘 날짜를 기본값으로 설정 (YYYY-MM-DD 형식)
  const [targetDate, setTargetDate] = useState(() => {
    const now = new Date();
    // 로컬 시간대 기준 YYYY-MM-DD 추출
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  });

  const [data, setData] = useState<ClosingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. 데이터 가져오기 (날짜가 변경될 때마다 실행)
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      setLoading(true); // 날짜 변경 시 로딩 표시
      setErrorMsg('');  // 에러 초기화

      try {
        const res = await fetch('/api/reports/closing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            employeeName, 
            print: false, 
            targetDate // ✨ 선택된 날짜 전송
          })
        });
        const json = await res.json();
        
        if (isMounted) {
          if (json.success) {
            setData(json.data);
          } else {
            setErrorMsg("Failed to load report data.");
            setData(null);
          }
          setLoading(false);
        }
      } catch (e) {
        if (isMounted) {
          setErrorMsg("Network error occurred.");
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [employeeName, targetDate]); // ✨ targetDate가 바뀌면 재실행

  // 2. 인쇄 핸들러
  const handlePrint = async () => {
    if (!window.confirm(`Print Report for [ ${targetDate} ]?`)) return;
    
    setPrinting(true);
    try {
      await fetch('/api/reports/closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            employeeName, 
            print: true,
            targetDate // ✨ 인쇄할 때도 날짜 전송
        })
      });
      alert("🖨️ Sent to Printer!");
      onClose();
    } catch (e) {
      alert("Print failed");
    } finally {
      setPrinting(false);
    }
  };

  // 3. 화면 렌더링 컨텐츠 결정
  let content;

  if (loading) {
    content = (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  } else if (errorMsg) {
    content = (
      <div className="flex flex-col items-center justify-center py-20 text-red-500">
        <p className="text-2xl font-bold mb-2">Error</p>
        <p>{errorMsg}</p>
      </div>
    );
  } else if (data) {
    content = (
      <div className="space-y-6">
        {/* 핵심: 현금 매출 */}
        <div className="bg-green-50 border-4 border-green-200 rounded-3xl p-8 text-center shadow-inner">
          <p className="text-green-700 font-bold uppercase text-lg mb-2">Total Cash (In Drawer)</p>
          <p className="text-6xl font-black text-green-800 tracking-tighter">
            ${data.cashTotal.toFixed(2)}
          </p>
          <p className="text-green-600 text-sm mt-2 font-medium">For Date: {targetDate}</p>
        </div>

        {/* 상세 내역 */}
        <div className="space-y-4 text-xl px-2">
          <div className="flex justify-between border-b border-gray-100 pb-3">
            <span className="text-gray-500 font-medium">Total Orders</span>
            <span className="font-bold text-gray-800">{data.orderCount}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-3">
            <span className="text-gray-500 font-medium">Card Sales</span>
            <span className="font-bold text-gray-800">${data.cardTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-3 text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
            <span className="font-bold">Total Tips (Payout)</span>
            <span className="font-black">+ ${data.tipTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-4 text-3xl">
            <span className="font-black text-gray-900">Grand Total</span>
            <span className="font-black text-gray-900">${data.grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  } else {
    content = <div className="text-center py-20 text-gray-500">No data found.</div>;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* 헤더 + 날짜 선택기 */}
        <div className="bg-gray-900 text-white p-6 text-center shrink-0">
          <h2 className="text-3xl font-black uppercase tracking-wide mb-4">Closing Report</h2>
          
          {/* ✨ 날짜 선택 Input */}
          <div className="flex justify-center">
            <input 
              type="date" 
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-gray-800 text-white text-xl font-bold px-6 py-2 rounded-xl border border-gray-600 focus:outline-none focus:border-blue-500 text-center"
            />
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {content}
        </div>

        {/* 하단 버튼 */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 grid grid-cols-2 gap-4 shrink-0">
          <button 
            onClick={onClose}
            className="py-4 rounded-2xl font-bold text-gray-600 bg-white border-2 border-gray-200 hover:bg-gray-100 text-xl transition-colors"
          >
            Close
          </button>
          
          <button 
            onClick={handlePrint}
            disabled={loading || printing || !data}
            className="py-4 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-500 shadow-xl active:scale-95 transition-all text-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {printing ? (
               <div className="flex items-center">
                 <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                 Printing...
               </div>
            ) : (
               <div className="flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 mr-2">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                 </svg>
                 PRINT
               </div>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}