"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AdminReportsPage() {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  // 날짜 설정 (기본값: 오늘)
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // 탭 상태: 'date' | 'employee' | 'item'
  const [activeTab, setActiveTab] = useState('date');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalSum, setTotalSum] = useState(0);

  useEffect(() => {
    fetchReport();
  }, [activeTab, startDate, endDate]);

  const fetchReport = async () => {
    setLoading(true);
    let rpcName = '';

    // 탭에 따라 호출할 DB 함수 결정
    if (activeTab === 'date') rpcName = 'get_sales_by_date';
    else if (activeTab === 'employee') rpcName = 'get_sales_by_employee';
    else if (activeTab === 'item') rpcName = 'get_sales_by_item';

    const { data, error } = await supabase.rpc(rpcName, {
      start_date: startDate,
      end_date: endDate
    });

    if (error) {
      console.error("Report Error:", error);
      alert("Failed to load report");
    } else {
      setReportData(data || []);
      // 총 매출 합계 계산 (화면 표시용)
      const sum = data?.reduce((acc: number, curr: any) => acc + (curr.total_revenue || curr.total_sales || 0), 0) || 0;
      setTotalSum(sum);
    }
    setLoading(false);
  };

  // 날짜 프리셋 버튼 핸들러
  const setDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">📊 Sales Reports</h1>

      {/* 1. 컨트롤 패널 (날짜 선택) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-wrap gap-4 items-end justify-between">
          <div className="flex gap-4 items-center">
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-gray-300 rounded-lg p-2 font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                />
             </div>
             <span className="text-gray-400 font-bold pb-2">~</span>
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-gray-300 rounded-lg p-2 font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                />
             </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setDateRange(0)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-600">Today</button>
            <button onClick={() => setDateRange(1)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-600">Yesterday</button>
            <button onClick={() => setDateRange(7)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-600">Last 7 Days</button>
            <button onClick={() => setDateRange(30)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-600">Last 30 Days</button>
          </div>
        </div>
      </div>

      {/* 2. 탭 메뉴 */}
      <div className="flex gap-4 mb-6 border-b border-gray-300 pb-1">
        {['date', 'employee', 'item'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-2 text-lg font-bold transition-all border-b-4 
              ${activeTab === tab 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            {tab === 'date' && '📅 By Date'}
            {tab === 'employee' && '👤 By Employee'}
            {tab === 'item' && '🍔 By Item'}
          </button>
        ))}
      </div>

      {/* 3. 리포트 테이블 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* 요약 헤더 */}
        <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-700 capitalize">{activeTab} Report</h2>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-3xl font-black text-green-600">${totalSum.toFixed(2)}</p>
          </div>
        </div>

        {loading ? (
          <div className="p-20 text-center text-gray-400 font-bold animate-pulse">Loading Data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-100 text-gray-500 uppercase text-xs font-bold">
                <tr>
                  <th className="p-4">
                    {activeTab === 'date' && 'Date'}
                    {activeTab === 'employee' && 'Employee Name'}
                    {activeTab === 'item' && 'Item Name'}
                  </th>
                  <th className="p-4 text-right">
                    {activeTab === 'item' ? 'Quantity Sold' : 'Total Orders'}
                  </th>
                  <th className="p-4 text-right">Revenue ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-10 text-center text-gray-400">No records found for this period.</td>
                  </tr>
                ) : (
                  reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-blue-50 transition-colors">
                      <td className="p-4 font-bold text-gray-800">
                        {activeTab === 'date' && row.sales_date}
                        {activeTab === 'employee' && row.employee_name}
                        {activeTab === 'item' && row.item_name}
                      </td>
                      <td className="p-4 text-right text-gray-600 font-mono">
                         {activeTab === 'item' ? row.total_quantity : row.total_orders}
                      </td>
                      <td className="p-4 text-right font-black text-gray-800">
                        ${(row.total_revenue || row.total_sales || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}