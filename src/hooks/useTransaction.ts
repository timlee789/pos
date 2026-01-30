import { useState } from 'react';
import { CartItem, Employee } from '@/lib/types';

// 프린터 서버 주소 (배치 파일로 실행된 로컬 서버)
const PRINTER_SERVER_URL = 'http://192.168.50.106:4000/print';

export function useTransaction() {
  const [isCardProcessing, setIsCardProcessing] = useState(false);
  const [cardStatusMessage, setCardStatusMessage] = useState('');
  
  // ✨ [핵심 수정] printScope 파라미터로 인쇄 대상 제어
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
      let saveRes;

      try {
          // 1. DB 저장/업데이트 로직
          if (orderId) {
             saveRes = await fetch('/api/orders/update', {
                 method: 'POST', headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ 
                     orderId, paymentMethod, transactionId, tip, total: finalTotal, status 
                 })
             });
          } else {
             saveRes = await fetch('/api/orders/create', {
                 method: 'POST', headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     items: cart, subtotal, tax: creditCardFee, tip, total: finalTotal,
                     paymentMethod, transactionId, orderType, tableNum,
                     employeeName: employee?.name || 'Unknown', status: status 
                 })
             });
          }
          
          const result = await saveRes.json();
          if (!result.success) throw new Error(result.error);
          
          newOrderNumber = result.order?.order_number || result.orderNumber;
          savedOrderId = result.order?.id || result.orderId || orderId; 

          // 2. ✨ 프린터 서버 전송 (Stripe 결제 전후로 나누어 출력)
          if (printScope !== 'NONE') {
              console.log(`🖨️ Printing Request: Scope=${printScope}`);
              
              await fetch(PRINTER_SERVER_URL, { 
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      items: cart, 
                      orderNumber: newOrderNumber, 
                      tableNumber: tableNum, 
                      orderType,
                      date: new Date().toLocaleString(), 
                      subtotal, 
                      tax: creditCardFee, 
                      tipAmount: tip,
                      totalAmount: finalTotal, 
                      paymentMethod, 
                      employeeName: employee?.name || 'Unknown',
                      
                      // ✨ [중요] 프린터 서버에게 무엇을 출력할지 명확히 지시
                      printKitchenOnly: printScope === 'KITCHEN', 
                      printReceiptOnly: printScope === 'RECEIPT' 
                  })
              });
          }
          
          return { success: true, orderNumber: newOrderNumber, orderId: savedOrderId };

      } catch (error: any) {
          console.error(error);
          return { success: false, error: error.message };
      }
  };

  const refundOrder = async (orderId: string, paymentIntentId: string, amount: number) => {
      try {
          const res = await fetch('/api/stripe/refund', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId, paymentIntentId, amount })
          });
          return await res.json();
      } catch (e: any) { return { success: false, error: e.message }; }
  };

  return { isCardProcessing, setIsCardProcessing, cardStatusMessage, setCardStatusMessage, processOrder, refundOrder };
}