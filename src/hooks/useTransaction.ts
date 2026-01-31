import { useState } from 'react';
import { CartItem, Employee } from '@/lib/types';

// ✨ [핵심 수정 1] IP 주소 대신 localhost 사용 (무조건 내 컴퓨터 내부에서 찾음)
const PRINTER_SERVER_URL = 'http://localhost:4000/print';

export function useTransaction() {
  const [isCardProcessing, setIsCardProcessing] = useState(false);
  const [cardStatusMessage, setCardStatusMessage] = useState('');
  
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
          // 1. DB 저장 (이건 이미 잘 되고 있음)
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

          // 2. ✨ [핵심 수정 2] 프린터 에러 무시 (Try-Catch로 감싸기)
          // 프린터 연결이 실패해도("Failed to fetch"), 여기서 에러를 삼켜버리고
          // 성공(success: true)을 리턴해서, POS가 멈추지 않고 Stripe 결제로 넘어가게 만듭니다.
          if (printScope !== 'NONE') {
              try {
                  console.log(`🖨️ Printing Request to localhost:4000... Scope=${printScope}`);
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
                          printKitchenOnly: printScope === 'KITCHEN', 
                          printReceiptOnly: printScope === 'RECEIPT' 
                      })
                  });
              } catch (printError) {
                  // 🚨 에러가 나도 로그만 찍고 넘어감! (멈추지 않음)
                  console.error("⚠️ Printer Connection Failed (Ignored):", printError);
              }
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