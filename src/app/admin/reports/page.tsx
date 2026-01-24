"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// 데이터 타입 정의
interface FinancialReportItem {
  report_date: string;
  total_orders: number;
  gross_sales: number;
  net_sales: number;
  total_tax: number;
  total_tips: number;
  cash_sales: number;
  card_sales: number;
  card_txn_count: number;
  // 계산된 필드
  stripe_fee?: number;
  doordash_sales?: number;
}

export default function AdminReportsPage() {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  // 날짜 설정 (기본값: 오늘)
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // 탭 상태
  const [activeTab, setActiveTab] = useState('financial'); // 기본값을 financial로 변경
  
  // 데이터 상태
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 요약 통계 상태
  const [summary, setSummary] = useState({
    cashSales: 0,
    cardSales: 0,
    tips: 0,
    tax: 0,
    stripeFee: 0,
    doorDash: 0,
    grandTotal: 0
  });

  useEffect(() => {
    fetchReport();
  }, [activeTab, startDate, endDate]);

  const fetchReport = async () => {
    setLoading(true);
    let rpcName = '';
    let params = { start_date: startDate, end_date: endDate };

    // 탭에 따라 호출할 DB 함수 결정
    if (activeTab === 'financial') rpcName = 'get_financial_report';
    else if (activeTab === 'employee') rpcName = 'get_sales_by_employee'; // 기존 함수 유지
    else if (activeTab === 'item') rpcName = 'get_sales_by_item';         // 기존 함수 유지

    const { data, error } = await supabase.rpc(rpcName, params);

    if (error) {
      console.error("Report Error:", error);
      alert("Failed to load report");
      setReportData([]);
    } else {
      let fetchedData = data || [];

      // Financial 탭일 경우 추가 계산 (Stripe Fee 등)
      if (activeTab === 'financial') {
        let sumCash = 0;
        let sumCard = 0;
        let sumTips = 0;
        let sumTax = 0;
        let sumStripe = 0;
        let sumDoorDash = 0; // 현재는 0
        let sumTotal = 0;

        fetchedData = fetchedData.map((item: FinancialReportItem) => {
          // Stripe Fee 계산: (카드매출 * 2.7%) + (카드결제건수 * $0.05)
          const stripeFee = (item.card_sales * 0.027) + (item.card_txn_count * 0.05);
          
          // 누적 합계 계산
          sumCash += item.cash_sales;
          sumCard += item.card_sales;
          sumTips += item.total_tips;
          sumTax += item.total_tax;
          sumStripe += stripeFee;
          sumTotal += item.net_sales;

          return { ...item, stripe_fee: stripeFee, doordash_sales: 0 };
        });

        setSummary({
          cashSales: sumCash,
          cardSales: sumCard,
          tips: sumTips,
          tax: sumTax,
          stripeFee: sumStripe,
          doorDash: sumDoorDash,
          grandTotal: sumTotal
        });
      }

      setReportData(fetchedData);
    }
    setLoading(false);
  };

  // 날짜 프리셋 버튼
  const setDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black text-gray-800">📊 Admin Reports</h1>
        {/* 날짜 표시 */}
        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-gray-600 font-bold">
           {startDate} ~ {endDate}
        </div>
      </div>

      {/* 1. 날짜 선택 패널 */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-wrap gap-4 items-end justify-between">
          <div className="flex gap-4 items-center">
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-gray-300 rounded-lg p-2 font-bold text-gray-700 outline-none focus:border-blue-500" />
             </div>
             <span className="text-gray-400 font-bold pb-2">-</span>
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-gray-300 rounded-lg p-2 font-bold text-gray-700 outline-none focus:border-blue-500" />
             </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDateRange(0)} className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-bold">Today</button>
            <button onClick={() => setDateRange(1)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-600">Yesterday</button>
            <button onClick={() => setDateRange(7)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-600">Last 7 Days</button>
            <button onClick={() => setDateRange(30)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-600">This Month</button>
          </div>
        </div>
      </div>

      {/* 2. 탭 메뉴 */}
      <div className="flex gap-6 mb-6 border-b border-gray-200">
        <button onClick={() => setActiveTab('financial')} className={`pb-3 px-2 text-lg font-bold transition-all border-b-4 ${activeTab === 'financial' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}>💰 Financial</button>
        <button onClick={() => setActiveTab('employee')} className={`pb-3 px-2 text-lg font-bold transition-all border-b-4 ${activeTab === 'employee' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}>👤 By Employee</button>
        <button onClick={() => setActiveTab('item')} className={`pb-3 px-2 text-lg font-bold transition-all border-b-4 ${activeTab === 'item' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}>🍔 By Item</button>
      </div>

      {/* 3. Financial Summary Cards (Financial 탭일 때만 표시) */}
      {activeTab === 'financial' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <SummaryCard title="Cash Sales" amount={summary.cashSales} color="green" />
            <SummaryCard title="Card Sales" amount={summary.cardSales} color="blue" />
            <SummaryCard title="Tips (Payout)" amount={summary.tips} color="purple" />
            <SummaryCard title="Sales Tax (7%)" amount={summary.tax} color="gray" />
            <SummaryCard title="Stripe Fee" amount={summary.stripeFee} color="red" isFee />
            <SummaryCard title="DoorDash" amount={summary.doorDash} color="orange" />
        </div>
      )}

      {/* 4. 리포트 테이블 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-gray-400 font-bold animate-pulse">Loading Data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-200">
                <tr>
                  {activeTab === 'financial' && (
                    <>
                        <th className="p-4">Date</th>
                        <th className="p-4 text-right text-green-600">Cash</th>
                        <th className="p-4 text-right text-blue-600">Card</th>
                        <th className="p-4 text-right">Tips</th>
                        <th className="p-4 text-right">Tax</th>
                        <th className="p-4 text-right text-red-500">Stripe Fee</th>
                        <th className="p-4 text-right text-orange-500">DoorDash</th>
                        <th className="p-4 text-right font-black">Total Revenue</th>
                    </>
                  )}
                  {activeTab === 'employee' && (
                    <>
                        <th className="p-4">Employee</th>
                        <th className="p-4 text-right">Orders</th>
                        <th className="p-4 text-right">Total Sales</th>
                    </>
                  )}
                  {activeTab === 'item' && (
                    <>
                        <th className="p-4">Item Name</th>
                        <th className="p-4 text-right">Qty</th>
                        <th className="p-4 text-right">Total Sales</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
                    {activeTab === 'financial' && (
                        <>
                            <td className="p-4 font-bold">{row.report_date}</td>
                            <td className="p-4 text-right text-green-700">${row.cash_sales.toFixed(2)}</td>
                            <td className="p-4 text-right text-blue-700">${row.card_sales.toFixed(2)}</td>
                            <td className="p-4 text-right">${row.total_tips.toFixed(2)}</td>
                            <td className="p-4 text-right">${row.total_tax.toFixed(2)}</td>
                            <td className="p-4 text-right text-red-600">-${row.stripe_fee?.toFixed(2)}</td>
                            <td className="p-4 text-right text-orange-600">${row.doordash_sales?.toFixed(2)}</td>
                            <td className="p-4 text-right font-black text-gray-900">${row.net_sales.toFixed(2)}</td>
                        </>
                    )}
                    {activeTab === 'employee' && (
                        <>
                            <td className="p-4">{row.employee_name}</td>
                            <td className="p-4 text-right">{row.total_orders}</td>
                            <td className="p-4 text-right font-bold">${(row.total_revenue || 0).toFixed(2)}</td>
                        </>
                    )}
                    {activeTab === 'item' && (
                        <>
                            <td className="p-4">{row.item_name}</td>
                            <td className="p-4 text-right">{row.total_quantity}</td>
                            <td className="p-4 text-right font-bold">${(row.total_revenue || 0).toFixed(2)}</td>
                        </>
                    )}
                  </tr>
                ))}
                {reportData.length === 0 && (
                    <tr><td colSpan={8} className="p-10 text-center text-gray-400">No data found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// 요약 카드 컴포넌트
function SummaryCard({ title, amount, color, isFee = false }: { title: string, amount: number, color: string, isFee?: boolean }) {
    const colorClasses: {[key: string]: string} = {
        green: "bg-green-50 border-green-200 text-green-700",
        blue: "bg-blue-50 border-blue-200 text-blue-700",
        purple: "bg-purple-50 border-purple-200 text-purple-700",
        red: "bg-red-50 border-red-200 text-red-700",
        orange: "bg-orange-50 border-orange-200 text-orange-700",
        gray: "bg-gray-50 border-gray-200 text-gray-700",
    };

    return (
        <div className={`p-4 rounded-2xl border-2 ${colorClasses[color]} flex flex-col items-start shadow-sm`}>
            <span className="text-xs font-bold uppercase opacity-70 mb-1">{title}</span>
            <span className="text-2xl font-black tracking-tight">
                {isFee ? '-' : ''}${amount.toFixed(2)}
            </span>
        </div>
    );
}