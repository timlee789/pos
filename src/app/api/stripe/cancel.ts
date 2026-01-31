import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // paymentIntentId는 없을 수도 있음 (단말기 강제 초기화 시)
  const { paymentIntentId } = req.body;
  const readerId = process.env.STRIPE_READER_ID_POS;

  console.log(`🧹 [초기화 요청] Reader: ${readerId}, PI: ${paymentIntentId || '없음(강제초기화)'}`);

  try {
    // 1. [서류 취소] PaymentIntent가 있으면 취소 시도
    if (paymentIntentId) {
        try {
            await stripe.paymentIntents.cancel(paymentIntentId);
            console.log("✅ PaymentIntent 취소 성공");
        } catch (e: any) {
            console.log("⚠️ PaymentIntent 취소 건너뜀 (이미 취소됨/없음):", e.message);
        }
    }

    // 2. [기계 멈춤] ✨ 여기가 핵심! ID가 있든 없든 단말기는 무조건 리셋 ✨
    if (readerId) {
        try {
            await stripe.terminal.readers.cancelAction(readerId);
            console.log(`✅ 단말기(${readerId}) 화면 초기화 명령 전송!`);
        } catch (readerError: any) {
            // 단말기가 이미 대기 상태(idle)라면 에러가 날 수 있는데, 이건 성공으로 칩니다.
            console.warn("ℹ️ 단말기 상태 알림:", readerError.message);
        }
    } else {
        throw new Error("환경변수 STRIPE_READER_ID_POS가 설정되지 않았습니다.");
    }

    res.status(200).json({ success: true, message: "Terminal Reset Triggered" });

  } catch (error: any) {
    console.error("❌ Reset Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}