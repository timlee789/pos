'use client';

import { useState } from 'react';

interface TipModalProps {
  subtotal: number;
  onSelectTip: (amount: number) => void;
  onCancel: () => void; 
}

export default function TipModal({ subtotal, onSelectTip, onCancel }: TipModalProps) {
  const [customTip, setCustomTip] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  // ✨ [수정] 팁 비율 변경: 10%, 15%, 20%
  const percentages = [10, 15, 20];

  const handleCustomTipSubmit = () => {
    const val = parseFloat(customTip);
    if (!isNaN(val) && val >= 0) {
      onSelectTip(val);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-white w-[90%] max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-bounce-in">
        
        {/* Header */}
        <div className="bg-gray-900 p-8 text-center">
          <h2 className="text-4xl font-black text-white mb-2">Add a Tip?</h2>
          <p className="text-gray-400 text-xl">Your support means a lot to our team!</p>
        </div>

        {/* Body */}
        <div className="p-8">
          <div className="flex flex-col gap-4">
            {/* Percentage Buttons */}
            <div className="grid grid-cols-3 gap-4">
              {percentages.map((pct) => {
                const tipVal = subtotal * (pct / 100);
                return (
                  <button
                    key={pct}
                    onClick={() => onSelectTip(tipVal)}
                    className="bg-blue-50 border-2 border-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-600 active:scale-95 transition-all py-8 rounded-3xl flex flex-col items-center justify-center gap-2 group"
                  >
                    <span className="text-3xl font-black group-hover:text-white text-blue-900">{pct}%</span>
                    <span className="text-xl font-bold text-gray-500 group-hover:text-blue-100">${tipVal.toFixed(2)}</span>
                  </button>
                );
              })}
            </div>

            {/* No Tip & Custom Tip Area */}
            <div className="grid grid-cols-2 gap-4 mt-2">
              <button
                onClick={() => onSelectTip(0)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-6 rounded-3xl text-2xl transition-colors"
              >
                No Tip
              </button>
              
              {/* Custom Tip Input or Button */}
              {!isCustomMode ? (
                <button
                  onClick={() => setIsCustomMode(true)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-6 rounded-3xl text-2xl transition-colors"
                >
                  Custom Amount
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={customTip}
                    onChange={(e) => setCustomTip(e.target.value)}
                    placeholder="$0.00"
                    className="w-full bg-gray-50 border-2 border-gray-300 rounded-3xl px-6 text-2xl font-bold focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={handleCustomTipSubmit}
                    className="bg-blue-600 text-white font-bold px-6 rounded-3xl text-xl"
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Go Back Button */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={onCancel}
              className="w-full text-red-500 font-bold text-xl py-4 hover:bg-red-50 rounded-2xl transition-colors"
            >
              Go Back
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}