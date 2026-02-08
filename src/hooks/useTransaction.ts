import { useState, useRef } from 'react';
import { CartItem, Employee } from '@/lib/types';

// ✨ [추가] 환경 변수에서 설정값 가져오기
const PRINTER_SERVER_URL = process.env.NEXT_PUBLIC_PRINTER_SERVER_URL || null;
const CARD_FEE_RATE = parseFloat(process.env.NEXT_PUBLIC_CARD_FEE_RATE || '0.03'); // 기본값 3%

export function useTransaction() {
  const [isCardProcessing, setIsCardProcessing] = useState(false);
  const [cardStatusMessage, setCardStatusMessage] = useState('');
  const currentPaymentIntentIdRef = useRef<string | null>(null);
  const isCancelledRef = useRef(false);

  // ✨ Webhook 연동을 위해 orderId와 description 파라미터 추가
  const processStripePayment = async (
    amount: number, 
    source: 'pos' | 'kiosk', 
    orderId: string, 
    description?: string 
  ) => {
    try {
      const response = await fetch('/api/stripe/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, source, orderId, description }),
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
      printScope: 'KITCHEN' | 'RECEIPT' | 'ALL' | 'NONE' = 'NONE' 
  ) => {
      // ✨ [수정] Tax와 Card Fee 분리 계산
      const taxAmount = subtotal * parseFloat(process.env.NEXT_PUBLIC_TAX_RATE || '0.07');
      
      // ✨ [추가] 카드 결제일 때만 수수료 계산 (Tax가 포함된 금액에 수수료를 매길지, Subtotal에만 매길지는 정책에 따름)
      // 보통은 (Subtotal + Tax) 전체 금액에 대해 3%를 매깁니다.
      const amountSubjectToFee = subtotal + taxAmount;
      const cardFee = paymentMethod === 'CARD' ? amountSubjectToFee * CARD_FEE_RATE : 0;

      // 최종 금액 = 음식값 + 세금 + 카드수수료 + 팁
      const finalTotal = subtotal + taxAmount + cardFee + tip;
      
      let savedOrderId = orderId;
      let newOrderNumber = '';

      try {
          const orderPayload = {
               items: cart, 
               subtotal, 
               tax: taxAmount,      // 세금 별도 저장
               cardFee: cardFee,    // ✨ [추가] 카드 수수료 별도 저장 (DB 컬럼 card_fee 매핑 필요)
               tip, 
               total: finalTotal,
               paymentMethod, 
               transactionId, 
               orderType, 
               tableNum,
               employeeName: employee?.name || 'Unknown', 
               status
          };

          const apiEndpoint = orderId ? '/api/orders/update' : '/api/orders/create';
          const body = orderId ? JSON.stringify({ orderId, ...orderPayload }) : JSON.stringify(orderPayload);

          const res = await fetch(apiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
          const result = await res.json();

          if (!result.success) throw new Error(result.error || "DB operation failed");
          
          savedOrderId = result.orderId || result.order?.id || orderId;
          newOrderNumber = result.orderNumber || result.order?.order_number;

          if (!savedOrderId) throw new Error("Critical: Server did not return Order ID.");

          const shouldPrintKitchen = printScope === 'KITCHEN' || printScope === 'ALL';
          const shouldPrintReceipt = printScope === 'RECEIPT' || printScope === 'ALL';

          // PRINTER_SERVER_URL이 있을 때만 실행 (에러 방지)
          if ((shouldPrintKitchen || shouldPrintReceipt) && PRINTER_SERVER_URL) {
              try {
                  await fetch(PRINTER_SERVER_URL, { 
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          items: cart, 
                          orderNumber: newOrderNumber, 
                          tableNumber: tableNum, 
                          orderType,
                          subtotal, 
                          tax: taxAmount, 
                          cardFee: cardFee, // ✨ [추가] 프린터 서버로 수수료 정보 전송
                          tipAmount: tip, 
                          totalAmount: finalTotal, 
                          paymentMethod, 
                          employeeName: employee?.name || 'Unknown',
                          date: new Date().toLocaleString(),
                          printKitchen: shouldPrintKitchen,
                          printReceipt: shouldPrintReceipt
                      })
                  });
              } catch (printError) {
                  console.error("⚠️ Printing ignored (Check Printer Server):", printError);
              }
          }
          return { success: true, orderId: savedOrderId };
      } catch (error: any) {
          console.error("Process Order Error:", error);
          return { success: false, error: error.message || "Unknown Error" };
      }
  };

  const refundOrder = async (orderId: string, paymentIntentId: string, amount: number) => {
      try {
          const res = await fetch('/api/stripe/refund', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, paymentIntentId, amount }) });
          return await res.json();
      } catch (e: any) { return { success: false, error: e.message }; }
  };

  const cancelPayment = async () => {
      isCancelledRef.current = true;
      setCardStatusMessage("Cancelling...");
      if (currentPaymentIntentIdRef.current) {
          try {
              await fetch('/api/stripe/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentIntentId: currentPaymentIntentIdRef.current }) });
          } catch (e) { console.error("Cancel API failed", e); }
      }
      setIsCardProcessing(false);
  };

  return { isCardProcessing, setIsCardProcessing, cardStatusMessage, setCardStatusMessage, processOrder, refundOrder, cancelPayment, processStripePayment };
}