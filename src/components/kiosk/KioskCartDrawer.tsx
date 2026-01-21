'use client';

import { useState } from 'react';
import { CartItem } from '@/lib/types';

interface KioskCartDrawerProps {
  cart: CartItem[];
  // ✨ [중요] 부모(KioskClient)와 타입 일치시킴: (id: string) => void
  onRemoveItem: (uniqueId: string) => void;
  subtotal: number;
  orderType: 'dine_in' | 'to_go' | null;
  tableNum: string | null;
  onPaymentComplete: () => void;
  printerServerUrl: string;
}

export default function KioskCartDrawer({
  cart,
  onRemoveItem,
  subtotal,
  orderType,
  tableNum,
  onPaymentComplete,
  printerServerUrl
}: KioskCartDrawerProps) {
  
  const [isOpen, setIsOpen] = useState(false); // 드로어 열림/닫힘 상태
  const [isProcessing, setIsProcessing] = useState(false); // 결제 진행 중 상태
  const [statusMessage, setStatusMessage] = useState(''); // 결제 상태 메시지

  const totalAmount = subtotal; // 키오스크는 팁/세금 일단 제외 (필요시 추가)

  // 결제 핸들러
  const handlePayment = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    setStatusMessage("Connecting to Card Reader...");

    try {
      // 1. Stripe 결제 의도 생성 (API 호출)
      const processRes = await fetch('/api/stripe/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalAmount }),
      });
      const processData = await processRes.json();
      
      if (!processData.success) throw new Error(processData.error || "Payment Init Failed");

      const { paymentIntentId } = processData;
      setStatusMessage("💳 Please Insert or Tap Card");

      // 2. 결제 완료 대기 (Polling)
      let isSuccess = false;
      for (let i = 0; i < 60; i++) { // 약 60초 대기
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const checkRes = await fetch('/api/stripe/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId }),
        });
        const checkData = await checkRes.json();

        if (checkData.status === 'succeeded') {
          isSuccess = true;
          break;
        } else if (checkData.status === 'failed') {
          throw new Error("Card Declined or Cancelled");
        }
      }

      if (!isSuccess) throw new Error("Payment Timeout");

      // 3. 결제 성공 후 주문 저장 (DB)
      setStatusMessage("Payment Successful! Saving Order...");
      
      const displayTableNum = orderType === 'to_go' ? 'To Go' : (tableNum || 'Dine In');

      const saveRes = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          subtotal: subtotal,
          tax: 0,
          tip: 0,
          total: totalAmount,
          paymentMethod: 'CARD', // 키오스크는 무조건 카드
          orderType: orderType || 'dine_in',
          tableNum: displayTableNum,
          employeeName: 'Kiosk',
          status: 'paid'
        })
      });

      const orderResult = await saveRes.json();
      if (!orderResult.success) throw new Error("Order Save Failed");

      // 4. 주방 프린터 전송
      try {
        await fetch(printerServerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart,
            orderNumber: orderResult.orderNumber,
            tableNumber: displayTableNum,
            orderType: orderType || 'dine_in',
            date: new Date().toLocaleString(),
            subtotal: subtotal,
            tax: 0,
            tipAmount: 0,
            totalAmount: totalAmount,
            paymentMethod: "CARD (Kiosk)",
            employeeName: "Kiosk"
          })
        });
      } catch (e) {
        console.error("Print Error:", e);
        // 프린터 에러는 사용자에게 치명적이지 않으므로 넘어감
      }

      setStatusMessage("✅ Order Complete! Please take your receipt.");
      await new Promise(r => setTimeout(r, 2000));
      
      // 5. 완료 처리 (장바구니 비우기 등)
      setIsOpen(false);
      onPaymentComplete();

    } catch (error: any) {
      console.error(error);
      setStatusMessage("❌ Error: " + error.message);
      await new Promise(r => setTimeout(r, 3000));
    } finally {
      setIsProcessing(false);
    }
  };

  // 장바구니에 아이템이 없으면 숨김
  if (cart.length === 0 && !isOpen) return null;

  return (
    <>
      {/* 1. 하단 고정 바 (요약 정보) */}
      {!isOpen && cart.length > 0 && (
        <div 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-0 left-0 w-full bg-red-600 text-white p-6 rounded-t-3xl shadow-2xl z-40 cursor-pointer animate-bounce-slight flex justify-between items-center"
        >
          <div className="flex items-center gap-4">
            <div className="bg-white text-red-600 font-black w-10 h-10 rounded-full flex items-center justify-center text-xl">
              {cart.reduce((acc, item) => acc + item.quantity, 0)}
            </div>
            <span className="text-2xl font-bold">View Order</span>
          </div>
          <span className="text-3xl font-black">${totalAmount.toFixed(2)}</span>
        </div>
      )}

      {/* 2. 전체 화면 드로어 (상세 내역 & 결제) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col justify-end">
          {/* 닫기 영역 (배경 클릭 시 닫기) */}
          <div className="flex-1" onClick={() => !isProcessing && setIsOpen(false)} />

          <div className="bg-gray-900 w-full rounded-t-3xl shadow-2xl border-t border-gray-700 max-h-[90vh] flex flex-col">
            
            {/* 헤더 */}
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-800 rounded-t-3xl">
              <h2 className="text-3xl font-black text-white">Your Order</h2>
              <button 
                onClick={() => setIsOpen(false)}
                disabled={isProcessing}
                className="text-gray-400 hover:text-white p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>

            {/* 주문 목록 스크롤 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.map((item) => (
                <div key={item.uniqueCartId} className="flex justify-between items-center bg-gray-800 p-4 rounded-2xl border border-gray-700">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">{item.name}</h3>
                    {item.selectedModifiers.map((mod, idx) => (
                      <p key={idx} className="text-gray-400 text-sm">+ {mod.name}</p>
                    ))}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-blue-400">${item.totalPrice.toFixed(2)}</span>
                    <button 
                      onClick={() => onRemoveItem(item.uniqueCartId)}
                      disabled={isProcessing}
                      className="bg-red-900/50 text-red-500 p-2 rounded-lg border border-red-900 hover:bg-red-600 hover:text-white transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 결제 버튼 영역 */}
            <div className="p-6 bg-gray-800 border-t border-gray-700">
              <div className="flex justify-between items-end mb-4">
                <span className="text-gray-400 text-xl font-medium">Total Amount</span>
                <span className="text-5xl font-black text-white tracking-tighter">${totalAmount.toFixed(2)}</span>
              </div>

              {isProcessing ? (
                <div className="w-full bg-blue-900/50 text-white text-2xl font-bold py-6 rounded-2xl flex flex-col items-center justify-center gap-2 animate-pulse border border-blue-500">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
                  {statusMessage}
                </div>
              ) : (
                <button
                  onClick={handlePayment}
                  className="w-full bg-green-600 hover:bg-green-500 text-white text-3xl font-black py-6 rounded-2xl shadow-lg shadow-green-900/30 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  PAY NOW
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}