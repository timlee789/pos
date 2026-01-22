'use client';

import { useState, useEffect } from 'react';

interface Props {
  onClose: () => void;
  onRecallOrder: (order: any) => void;
  // ✨ [추가] 환불 핸들러 받기
  onRefundOrder: (order: any) => void;
}

export default function OrderListModal({ onClose, onRecallOrder, onRefundOrder }: Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'open' | 'paid' | 'refunded'>('open'); // ✨ refunded 탭 추가
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = () => {
    setIsLoading(true);
    fetch('/api/orders/list')
      .then(res => res.json())
      .then(data => {
        if (data.success) setOrders(data.orders);
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

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
          <button onClick={() => setActiveTab('open')} className={`flex-1 py-5 text-xl font-bold transition-colors ${activeTab === 'open' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-500'}`}>
            ⏳ OPEN ({orders.filter(o => o.status === 'open').length})
          </button>
          <button onClick={() => setActiveTab('paid')} className={`flex-1 py-5 text-xl font-bold transition-colors ${activeTab === 'paid' ? 'bg-green-600 text-white' : 'bg-gray-900 text-gray-500'}`}>
            ✅ PAID
          </button>
          {/* ✨ 환불된 내역 탭 */}
          <button onClick={() => setActiveTab('refunded')} className={`flex-1 py-5 text-xl font-bold transition-colors ${activeTab === 'refunded' ? 'bg-red-600 text-white' : 'bg-gray-900 text-gray-500'}`}>
            ↩️ REFUNDED
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
                      ? 'bg-gray-800 border-blue-900 hover:border-blue-500 cursor-pointer' 
                      : 'bg-gray-900 border-gray-800 opacity-80'}`}
                  onClick={() => {
                    if (activeTab === 'open') {
                        if(confirm(`Recall Open Order #${order.order_number}?`)) onRecallOrder(order);
                    }
                  }}
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-gray-700 text-white px-3 py-1 rounded text-sm font-bold">#{order.order_number}</span>
                      <span className="text-yellow-400 font-bold text-xl">{order.table_number}</span>
                      <span className="text-gray-400 text-sm">{new Date(order.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-gray-300 text-sm">
                      {order.order_items?.map((item: any) => item.item_name).join(', ')}
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <div className="text-2xl font-black text-white">${order.total_amount.toFixed(2)}</div>
                    
                    {activeTab === 'open' && <span className="text-blue-400 font-bold text-sm bg-blue-900/30 px-2 py-1 rounded">Click to Pay</span>}
                    
                    {activeTab === 'paid' && (
                       <div className="flex gap-2 items-center">
                          <span className="text-green-500 font-bold text-sm mr-2">{order.payment_method}</span>
                          {/* ✨ [핵심] 환불 버튼 */}
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onRefundOrder(order);
                            }}
                            className="bg-red-900 text-red-300 text-xs px-3 py-1 rounded border border-red-700 hover:bg-red-600 hover:text-white font-bold transition-colors"
                          >
                             REFUND
                          </button>
                       </div>
                    )}

                    {activeTab === 'refunded' && <span className="text-red-500 font-bold text-sm border border-red-500 px-2 rounded">REFUNDED</span>}
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