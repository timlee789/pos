import { useState, useRef } from 'react'; // useRef 추가됨
import { CartItem, Employee } from '@/lib/types';

const PRINTER_SERVER_URL = 'http://localhost:4000/print';

export function useTransaction() {
  const [isCardProcessing, setIsCardProcessing] = useState(false);
  const [cardStatusMessage, setCardStatusMessage] = useState('');
  
  // ✨ [추가] 취소할 때 필요한 ID를 저장하는 금고
  const currentPaymentIntentIdRef = useRef<string | null>(null);
  // ✨ [추가] "취소 버튼 눌렀니?" 확인용 깃발
  const isCancelledRef = useRef(false);

  // 1. 주문 처리 (기존과 동일하지만 정석 버전 유지)
  const processOrder = async (
      cart: CartItem[], 
      subtotal: number, 
      tip: number, 
      paymentMethod: 'CASH' | 'CARD' | 'PENDING', 
      orderType: string, 
      tableNum: string, 
      employee: Employee | null,
      orderId: string | null = null,
      transactionId: string | null = null,
      status: 'open' | 'paid' | 'processing' = 'paid',
      printScope: 'ALL' | 'KITCHEN' | 'RECEIPT' | 'NONE' = 'ALL' 
  ) => {
      const creditCardFee = paymentMethod === 'CARD' ? subtotal * 0.03 : 0;
      const finalTotal = subtotal + creditCardFee + tip;
      
      let newOrderNumber = '';
      let savedOrderId = orderId; 

      try {
          let saveRes;
          const bodyData = {
               items: cart, subtotal, tax: creditCardFee, tip, total: finalTotal,
               paymentMethod, transactionId, orderType, tableNum,
               employeeName: employee?.name || 'Unknown', status
          };

          if (orderId) {
             saveRes = await fetch('/api/orders/update', {
                 method: 'POST', headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ orderId, ...bodyData })
             });
          } else {
             saveRes = await fetch('/api/orders/create', {
                 method: 'POST', headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(bodyData)
             });
          }
          
          const result = await saveRes.json();
          if (!result.success) throw new Error(result.error || "DB Save Failed");
          
          newOrderNumber = result.orderNumber || result.order?.order_number;
          savedOrderId = result.orderId || result.order?.id || orderId; 

          if (!savedOrderId) throw new Error("Critical Error: Server did not return Order ID.");

          if (printScope !== 'NONE') {
              try {
                  await fetch(PRINTER_SERVER_URL, { 
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          items: cart, orderNumber: newOrderNumber, tableNumber: tableNum, orderType,
                          subtotal, tax: creditCardFee, tipAmount: tip, totalAmount: finalTotal, 
                          paymentMethod, employeeName: employee?.name || 'Unknown',
                          date: new Date().toLocaleString(),
                          printKitchen: printScope === 'KITCHEN' || printScope === 'ALL',
                          printReceipt: printScope === 'RECEIPT' || printScope === 'ALL'
                      })
                  });
              } catch (printError) { console.error("⚠️ Print Ignored:", printError); }
          }
          return { success: true, orderNumber: newOrderNumber, orderId: savedOrderId };
      } catch (error: any) {
          console.error("Process Order Error:", error);
          return { success: false, error: error?.message || "Unknown Error" };
      }
  };

  // 2. 환불 함수
  const refundOrder = async (orderId: string, paymentIntentId: string, amount: number) => {
      try {
          const res = await fetch('/api/stripe/refund', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId, paymentIntentId, amount })
          });
          return await res.json();
      } catch (e: any) { return { success: false, error: e.message }; }
  };

  // ✨ [신규] 결제 취소 함수
  const cancelPayment = async () => {
      // 깃발을 들어서 "그만해!"라고 알림
      isCancelledRef.current = true;
      setCardStatusMessage("Cancelling...");

      const pid = currentPaymentIntentIdRef.current;
      if (pid) {
          try {
              await fetch('/api/stripe/cancel', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ paymentIntentId: pid })
              });
          } catch (e) { console.error("Cancel API failed", e); }
      }
      setIsCardProcessing(false);
  };

  // 상태값과 함수들 내보내기 (ref도 함께 내보내서 로직에서 씁니다)
  return { 
      isCardProcessing, setIsCardProcessing, 
      cardStatusMessage, setCardStatusMessage, 
      processOrder, refundOrder, cancelPayment, // cancelPayment 추가됨
      currentPaymentIntentIdRef, isCancelledRef // 로직 제어용
  };
}