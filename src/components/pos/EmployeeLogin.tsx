"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Props {
  onLoginSuccess: (employee: { id: number; name: string; role: string }) => void;
}

export default function EmployeeLogin({ onLoginSuccess }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleNumClick = (num: string) => {
    if (pin.length < 6) setPin(prev => prev + num);
    setError("");
  };

  const handleClear = () => setPin("");
  const handleBackspace = () => setPin(prev => prev.slice(0, -1));

  const handleLogin = async () => {
    if (!pin) return;
    setLoading(true);
    
    // DB에서 PIN 확인
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('pin_code', pin)
      .eq('is_active', true)
      .single();

    setLoading(false);

    if (data) {
      // 로그인 성공
      onLoginSuccess({ id: data.id, name: data.name, role: data.role });
    } else {
      setError("Invalid PIN Code");
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-[9999]">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-[400px] text-center">
        <h2 className="text-3xl font-black text-gray-800 mb-2">POS LOGIN</h2>
        <p className="text-gray-400 mb-8">Enter your Employee PIN</p>

        {/* PIN Display */}
        <div className="bg-gray-100 p-4 rounded-xl mb-6 flex justify-center items-center h-16 border-2 border-transparent focus-within:border-blue-500">
          <span className="text-4xl font-mono tracking-[1em] text-gray-800">
            {'•'.repeat(pin.length)}
          </span>
        </div>

        {error && <p className="text-red-500 font-bold mb-4 animate-pulse">{error}</p>}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} onClick={() => handleNumClick(num.toString())} className="h-20 bg-gray-50 rounded-2xl text-2xl font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm border border-gray-200">
              {num}
            </button>
          ))}
          <button onClick={handleClear} className="h-20 bg-red-50 text-red-500 font-bold rounded-2xl hover:bg-red-100">C</button>
          <button onClick={() => handleNumClick("0")} className="h-20 bg-gray-50 text-gray-700 font-bold text-2xl rounded-2xl hover:bg-blue-50">0</button>
          <button onClick={handleBackspace} className="h-20 bg-gray-50 text-gray-700 font-bold rounded-2xl hover:bg-gray-200">←</button>
        </div>

        <button 
          onClick={handleLogin} 
          disabled={loading || pin.length === 0}
          className="w-full h-16 bg-blue-600 text-white text-xl font-black rounded-2xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg"
        >
          {loading ? "Checking..." : "ENTER"}
        </button>
      </div>
    </div>
  );
}