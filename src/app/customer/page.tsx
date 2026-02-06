'use client';

import { useEffect, useState, useRef } from 'react';
import { CartItem, ModifierGroup, ModifierOption } from '@/lib/types';
import { CustomerViewMode } from '@/hooks/useCustomerDisplay';

const AD_CONTENTS = [
  { type: 'image', src: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1920&q=80' }, 
  { type: 'image', src: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=1920&q=80' }, 
  { type: 'image', src: 'https://images.unsplash.com/photo-1561758033-d8f19662cb23?auto=format&fit=crop&w=1920&q=80' }, 
];

export default function CustomerPage() {
  const [viewMode, setViewMode] = useState<CustomerViewMode>('IDLE');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [activeItemName, setActiveItemName] = useState('');
  const [availableGroups, setAvailableGroups] = useState<ModifierGroup[]>([]);
  
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const interval = setInterval(async () => {
        try {
            const res = await fetch('/api/display', { cache: 'no-store' });
            if (!res.ok) return;
            
            const data = await res.json();
            
            if (data.lastUpdated && data.lastUpdated !== lastUpdateRef.current) {
                lastUpdateRef.current = data.lastUpdated;
                
                setViewMode(data.mode);
                setCart(data.cart || []);
                setTotal(data.total || 0);
                setActiveItemName(data.activeItemName || '');
                setAvailableGroups(data.availableGroups || []);
            }
        } catch (e) {
            // Ignore network errors
        }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // 1. handleTipSelect 함수 수정 (문자열 'NO' 처리 제거하고 숫자만 받도록 단순화)
const handleTipSelect = (percentage: number) => {
  // 0이 들어오면 0원, 10이 들어오면 10% 계산
  const tipAmount = total * (percentage / 100);
  
  // BroadcastChannel 전송 (POS에게 "팁이 0원이다, 결제 진행해라"라고 알림)
  const ch = new BroadcastChannel('pos-customer-display');
  ch.postMessage({ type: 'TIP_SELECTED', payload: { amount: tipAmount } });
  setTimeout(() => ch.close(), 100);

  // 백업용 스토리지 저장
  localStorage.setItem('POS_TIP_SELECTED', JSON.stringify({ 
      amount: tipAmount, 
      timestamp: Date.now() 
  }));
};

  const handleOrderTypeSelect = (orderType: 'DINE_IN' | 'TO_GO') => {
    const ch = new BroadcastChannel('pos-customer-display');
    ch.postMessage({ type: 'ORDER_TYPE_SELECTED', payload: { type: orderType } });
    setTimeout(() => ch.close(), 100);

    localStorage.setItem('POS_ORDER_TYPE_SELECTED', JSON.stringify({
        type: orderType,
        timestamp: Date.now()
    }));
  };

  if (viewMode === 'IDLE') return <IdleSlideshow />;

  if (viewMode === 'PAYMENT_SUCCESS') {
    return (
      <div className="h-screen bg-green-600 flex flex-col items-center justify-center text-white animate-in zoom-in duration-300">
        <h1 className="text-8xl font-black mb-4">THANK YOU!</h1>
        <p className="text-4xl">Your order is being prepared.</p>
      </div>
    );
  }

  if (viewMode === 'PROCESSING') {
    return (
      <div className="h-screen bg-blue-600 flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
        <div className="mb-10 animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-40 h-40">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
        </div>
        <h1 className="text-6xl font-black mb-6">Please Insert / Tap Card</h1>
        <p className="text-3xl text-blue-200">Processing your payment...</p>
        <div className="mt-8 text-4xl font-bold bg-white/20 px-8 py-4 rounded-2xl">
           Total: ${total.toFixed(2)} + Tip
        </div>
      </div>
    );
  }

  if (viewMode === 'TIPPING') {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center p-10">
        <h1 className="text-5xl font-black text-gray-800 mb-4">Would you like to add a Tip?</h1>
        <p className="text-2xl text-gray-500 mb-10">Your support goes directly to our team!</p>
        <div className="grid grid-cols-2 gap-6 w-full max-w-4xl">
           <TipButton label="10%" sub={`$${(total * 0.10).toFixed(2)}`} onClick={() => handleTipSelect(10)} />
           <TipButton label="15%" sub={`$${(total * 0.15).toFixed(2)}`} onClick={() => handleTipSelect(15)} />
           <TipButton label="20%" sub={`$${(total * 0.20).toFixed(2)}`} onClick={() => handleTipSelect(20)} />
           
           {/* ✨ [핵심 수정] 
               1. 'NO' 대신 숫자 0을 전달 -> 0원 팁으로 계산되어 결제 진행됨
               2. sub 텍스트를 "Skip"에서 "$0.00" 또는 "Pay Now"로 변경하여 결제 진행임을 명시
           */}
           <TipButton 
               label="No Tip" 
               sub="$0.00" 
               onClick={() => handleTipSelect(0)} 
               color="gray" 
           />
        </div>
      </div>
    );
}

  if (viewMode === 'ORDER_TYPE_SELECT') {
    return (
      <div className="h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
         <h2 className="text-4xl text-gray-400 font-bold mb-12 uppercase tracking-widest">How would you like your order?</h2>
         <div className="flex gap-12">
            <button onClick={() => handleOrderTypeSelect('DINE_IN')} className="w-[400px] h-[300px] bg-gray-800 rounded-3xl border-4 border-gray-700 flex flex-col items-center justify-center transition-all hover:bg-gray-700 hover:border-blue-500 active:scale-95">
                <span className="text-8xl mb-4">🍽️</span>
                <span className="text-5xl font-black">Dine In</span>
            </button>
            <button onClick={() => handleOrderTypeSelect('TO_GO')} className="w-[400px] h-[300px] bg-gray-800 rounded-3xl border-4 border-gray-700 flex flex-col items-center justify-center transition-all hover:bg-gray-700 hover:border-blue-500 active:scale-95">
                <span className="text-8xl mb-4">🛍️</span>
                <span className="text-5xl font-black">To Go</span>
            </button>
         </div>
      </div>
    );
  }

  if (viewMode === 'TABLE_NUMBER_SELECT') {
    return (
      <div className="h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
         <div className="bg-gray-800 p-12 rounded-[3rem] shadow-2xl border border-gray-700 text-center w-[600px]">
             <p className="text-3xl text-gray-400 font-bold mb-6 uppercase tracking-widest">Table Service</p>
             <h1 className="text-6xl font-black mb-8">Table Number</h1>
             <div className="w-full h-32 bg-black rounded-2xl flex items-center justify-center border-2 border-gray-600">
                <span className="text-6xl text-gray-500 animate-pulse">Entering...</span>
             </div>
             <p className="mt-8 text-xl text-gray-500">Please wait while we set up your table.</p>
         </div>
      </div>
    );
  }

  if (viewMode === 'MODIFIER_SELECT') {
    return (
      <div className="h-screen bg-gray-900 flex text-white">
        <div className="flex-1 p-8 border-r border-gray-800 overflow-y-auto">
             <div className="mb-10 border-b border-gray-700 pb-6">
                 <p className="text-yellow-500 text-xl font-bold uppercase tracking-widest mb-2">Select Options For</p>
                 <h1 className="text-7xl font-black text-white leading-tight">{activeItemName}</h1>
             </div>
             <div className="space-y-10">
                {(!availableGroups || availableGroups.length === 0) ? (
                    <p className="text-2xl text-gray-500">Loading options...</p>
                ) : (
                    availableGroups.map((group, idx) => (
                        <div key={idx} className="bg-gray-800 rounded-3xl p-6 shadow-lg">
                            <h3 className="text-3xl font-bold text-blue-400 mb-6 border-l-4 border-blue-500 pl-4 uppercase">{group.name}</h3>
                            <div className="grid grid-cols-3 gap-4">
                                {group.options?.map((opt: ModifierOption, oIdx: number) => (
                                    <div key={oIdx} className="bg-gray-700/50 p-4 rounded-xl flex flex-col items-center justify-center text-center h-32 border border-gray-600">
                                        <span className="text-2xl font-bold text-gray-200">{opt.name}</span>
                                        {opt.price > 0 && <span className="mt-2 text-lg text-yellow-400 font-bold bg-black/30 px-3 py-1 rounded-full">+${opt.price.toFixed(2)}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
             </div>
        </div>
        <div className="w-[400px] bg-black p-8 border-l border-gray-800 opacity-40">
             <h2 className="text-3xl font-bold mb-6 text-gray-500">Cart</h2>
             <div className="space-y-4">
                {cart.map((item, i) => (
                   <div key={i} className="text-gray-500 border-b border-gray-800 pb-2">
                      <div className="flex justify-between text-xl font-bold">
                         <span>{item.name}</span>
                         <span>${item.totalPrice.toFixed(2)}</span>
                      </div>
                   </div>
                ))}
             </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex">
      <div className="flex-1 p-8 border-r border-gray-800 overflow-y-auto">
         <h2 className="text-4xl font-black mb-8 text-gray-500 tracking-wider">YOUR ORDER</h2>
         <div className="space-y-4">
            {cart.map((item, i) => (
               <div key={i} className="bg-gray-900/60 p-6 rounded-3xl border border-gray-800 flex justify-between items-start animate-in fade-in slide-in-from-left-4">
                  <div>
                    <span className="text-4xl font-bold text-white">{item.name}</span>
                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                       <div className="mt-3 pl-4 border-l-4 border-yellow-500 space-y-1">
                          {item.selectedModifiers.map((m, idx) => (
                             <div key={idx} className="text-2xl text-yellow-400 font-medium">
                                + {m.name} {m.price > 0 && <span className="text-gray-500 text-lg">(${m.price.toFixed(2)})</span>}
                             </div>
                          ))}
                       </div>
                    )}
                    {item.notes && <div className="text-xl text-blue-400 mt-2 italic">Note: {item.notes}</div>}
                  </div>
                  <span className="text-4xl font-bold text-gray-200">${item.totalPrice.toFixed(2)}</span>
               </div>
            ))}
         </div>
         <div className="h-20"></div>
      </div>
      <div className="w-[400px] bg-gray-900 p-8 flex flex-col justify-center shadow-2xl z-10">
         <p className="text-center text-gray-400 text-2xl mb-4 uppercase tracking-widest font-bold">Total Amount</p>
         <div className="text-8xl font-black text-center text-green-500 tracking-tighter">
            ${total.toFixed(2)}
         </div>
         <p className="text-center text-gray-600 mt-4 text-lg">Tax included in final step</p>
      </div>
    </div>
  );
}

function IdleSlideshow() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % AD_CONTENTS.length), 5000); 
    return () => clearInterval(timer);
  }, []);
  const content = AD_CONTENTS[index];

  return (
    <div className="h-screen w-full bg-black flex items-center justify-center overflow-hidden relative">
      <div className="absolute inset-0 z-0 w-full h-full">
          {content.type === 'video' ? (
              <video src={content.src} className="w-full h-full object-cover" autoPlay muted loop />
          ) : (
              <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${content.src})` }} />
          )}
      </div>
      <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none" />
    </div>
  );
}

function TipButton({ label, sub, onClick, highlight, color = 'blue' }: any) {
  const baseClass = "h-40 rounded-3xl flex flex-col items-center justify-center transition-all active:scale-95 shadow-xl border-4";
  const colors: any = {
    blue: highlight 
      ? "bg-blue-600 border-blue-400 text-white hover:bg-blue-500" 
      : "bg-white border-blue-100 text-blue-900 hover:bg-blue-50",
    gray: "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200"
  };
  return (
    <button onClick={onClick} className={`${baseClass} ${colors[color]}`}>
      <span className="text-5xl font-black">{label}</span>
      <span className="text-2xl font-bold mt-2 opacity-80">{sub}</span>
    </button>
  );
}