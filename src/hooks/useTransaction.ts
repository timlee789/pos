'''import { useState, useRef } from 'react';
import { CartItem, Employee } from '@/lib/types';

const PRINTER_SERVER_URL = 'http://localhost:4000/print';

export function useTransaction() {
  const [isCardProcessing, setIsCardProcessing] = useState(false);
  const [cardStatusMessage, setCardStatusMessage] = useState('');
  const currentPaymentIntentIdRef = useRef<string | null>(null);
  const isCancelledRef = useRef(false);

  // New function to handle Stripe Payment
  const processStripePayment = async (amount: number, source: 'pos' | 'kiosk', orderId: string) => {
    try {
      const response = await fetch('/api/stripe/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, source, orderId }),
      });
      const result = await response.json();
      if (result.success) {
        currentPaymentIntentIdRef.current = result.paymentIntentId;
      }
      return result;
    } catch (error: any) {
      console.error("Stripe Payment Error:", error);
      return { success: false, error: error.message };
    }
  };

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
      printScope: 'KITCHEN' | 'RECEIPT' | 'NONE' = 'NONE' 
  ) => {
      const creditCardFee = paymentMethod === 'CARD' ? subtotal * 0.03 : 0;
      const finalTotal = subtotal + creditCardFee + tip;
      
      let newOrderNumber = '';
      let savedOrderId = orderId; 

      try {
          const bodyData = {
               items: cart, subtotal, tax: creditCardFee, tip, total: finalTotal,
               paymentMethod, transactionId, orderType, tableNum,
               employeeName: employee?.name || 'Unknown', status
          };

          let saveRes;
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
                          printKitchen: printScope === 'KITCHEN',
                          printReceipt: printScope === 'RECEIPT'
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

  const refundOrder = async (orderId: string, paymentIntentId: string, amount: number) => {
      try {
          const res = await fetch('/api/stripe/refund', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId, paymentIntentId, amount })
          });
          return await res.json();
      } catch (e: any) { return { success: false, error: e.message }; }
  };

  const cancelPayment = async () => {
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

  return { 
      isCardProcessing, setIsCardProcessing, 
      cardStatusMessage, setCardStatusMessage, 
      processOrder, refundOrder, cancelPayment,
      processStripePayment, // Export the new function
      currentPaymentIntentIdRef, isCancelledRef
  };
}
''