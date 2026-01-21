'use client';

import { useState, useEffect } from 'react';

interface Props {
  onClose: () => void;
  onRecallOrder: (order: any) => void; // 부모에게 주문 정보를 넘겨주는 함수
}

export default function OrderListModal({ onClose, onRecallOrder }: Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'open' | 'paid'>('open');
  const [isLoading, setIsLoading] = useState(true);

  // 데이터 로드
  useEffect(() => {
    fetch('/api/orders/list')
      .then(res => res.json())
      .then(data => {
        if (data.success) setOrders(data.orders);
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  // 탭에 따라 필터링
  const filteredOrders = orders.filter(o => o.status === activeTab);

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="bg-gray-900 w-full max-w-5xl h-[85vh] rounded-3xl border border-gray-700 flex flex-col shadow-2xl overflow-hidden">
        
        {/* 헤더 */}
        <div className="p-6 bg-gray-800 border-b border-gray-700 flex justify-between items-center shrink-0">
          <h2 className="text-3xl font-black text-white">📋 Order History</h2>
          <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
               <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 탭 버튼 */}
        <div className="flex border-b border-gray-700 shrink-0">
          <button 
            onClick={() => setActiveTab('open')}
            className={`flex-1 py-5 text-xl font-bold transition-colors
              ${activeTab === 'open' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-500 hover:bg-gray-800'}`}
          >
            ⏳ OPEN ORDERS ({orders.filter(o => o.status === 'open').length})
          </button>
          <button 
            onClick={() => setActiveTab('paid')}
            className={`flex-1 py-5 text-xl font-bold transition-colors
              ${activeTab === 'paid' ? 'bg-green-600 text-white' : 'bg-gray-900 text-gray-500 hover:bg-gray-800'}`}
          >
            ✅ PAID ORDERS
          </button>
        </div>

        {/* 리스트 영역 */}
        <div className="flex-1 overflow-y-auto p-6 bg-black/50">
          {isLoading ? (
            <div className="text-white text-center mt-20 text-2xl">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-gray-500 text-center mt-20 text-2xl font-bold">No {activeTab} orders found.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredOrders.map((order) => (
                <div 
                  key={order.id} 
                  className={`p-5 rounded-2xl border-2 flex justify-between items-center transition-all
                    ${activeTab === 'open' 
                      ? 'bg-gray-800 border-blue-900 hover:border-blue-500 cursor-pointer hover:bg-gray-750' 
                      : 'bg-gray-900 border-gray-800 opacity-80'}`}
                  onClick={() => {
                    if (activeTab === 'open') {
                        if(confirm(`Recall Open Order #${order.order_number}?`)) {
                            onRecallOrder(order);
                        }
                    }
                  }}
                >
                  {/* 왼쪽: 주문 정보 */}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-gray-700 text-white px-3 py-1 rounded text-sm font-bold">#{order.order_number}</span>
                      <span className="text-yellow-400 font-bold text-xl">{order.table_number}</span>
                      <span className="text-gray-400 text-sm">
                        {new Date(order.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    {/* 메뉴 요약 */}
                    <div className="text-gray-300 text-sm">
                      {order.order_items.map((item: any) => item.item_name).join(', ')}
                    </div>
                  </div>

                  {/* 오른쪽: 가격 및 버튼 */}
                  <div className="text-right">
                    <div className="text-2xl font-black text-white mb-1">
                      ${order.total_amount.toFixed(2)}
                    </div>
                    {activeTab === 'open' && (
                       <span className="text-blue-400 font-bold text-sm bg-blue-900/30 px-2 py-1 rounded">Click to Pay</span>
                    )}
                    {activeTab === 'paid' && (
                       <span className="text-green-500 font-bold text-sm">Paid by {order.payment_method}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}