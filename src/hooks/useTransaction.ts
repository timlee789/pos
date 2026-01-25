import { useState } from 'react';
import { CartItem, Employee } from '@/lib/types';

const PRINTER_SERVER_URL = 'http://192.168.50.106:4000/print';

export function useTransaction() {
  const [isCardProcessing, setIsCardProcessing] = useState(false);
  const [cardStatusMessage, setCardStatusMessage] = useState('');
  
  // 영수증 프린트 & DB 저장 (통합 함수)
  const processOrder = async (
      cart: CartItem[], 
      subtotal: number, 
      tip: number, 
      paymentMethod: 'CASH' | 'CARD' | 'PENDING', 
      orderType: string, 
      tableNum: string, 
      employee: Employee | null,
      orderId: string | null = null,
      transactionId: string | null = null
  ) => {
      const creditCardFee = paymentMethod === 'CARD' ? subtotal * 0.03 : 0;
      const finalTotal = subtotal + creditCardFee + tip;
      
      let newOrderNumber = '';
      let saveRes;

      try {
          // 1. DB 저장/업데이트
          if (orderId) {
             saveRes = await fetch('/api/orders/update', {
                 method: 'POST', headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ orderId, paymentMethod, transactionId, tip, total: finalTotal })
             });
          } else {
             saveRes = await fetch('/api/orders/create', {
                 method: 'POST', headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     items: cart, subtotal, tax: creditCardFee, tip, total: finalTotal,
                     paymentMethod, transactionId, orderType, tableNum,
                     employeeName: employee?.name || 'Unknown', status: paymentMethod === 'PENDING' ? 'open' : 'paid'
                 })
             });
          }
          
          const result = await saveRes.json();
          if (!result.success) throw new Error(result.error);
          newOrderNumber = result.order?.order_number || result.orderNumber;

          // 2. 프린터 전송
          await fetch(PRINTER_SERVER_URL, { 
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  items: cart, orderNumber: newOrderNumber, tableNumber: tableNum, orderType,
                  date: new Date().toLocaleString(), subtotal, tax: creditCardFee, tipAmount: tip,
                  totalAmount: finalTotal, paymentMethod, employeeName: employee?.name || 'Unknown',
                  printKitchenOnly: paymentMethod === 'PENDING' // 전화주문은 주방만
              })
          });
          
          return { success: true, orderNumber: newOrderNumber };

      } catch (error: any) {
          console.error(error);
          return { success: false, error: error.message };
      }
  };

  // Stripe 환불
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