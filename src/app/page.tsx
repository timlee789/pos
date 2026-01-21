import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-10 gap-8">
      
      {/* 타이틀 */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-black text-white mb-4 tracking-tight">
          COLLEGIATE GRILL
        </h1>
        <p className="text-gray-400 text-xl">System Launcher</p>
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
        
        {/* 1. Kiosk Mode */}
        <Link 
          href="/kiosk" 
          className="group relative h-80 bg-gray-900 rounded-3xl border-2 border-gray-800 hover:border-blue-500 hover:bg-gray-800 transition-all flex flex-col items-center justify-center p-8 shadow-2xl"
        >
          <div className="bg-blue-900/30 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-16 h-16 text-blue-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-white mb-2">KIOSK MODE</h2>
          <p className="text-gray-500 font-medium text-lg">Customer Self-Ordering</p>
        </Link>

        {/* 2. POS Mode */}
        <Link 
          href="/pos" 
          className="group relative h-80 bg-gray-900 rounded-3xl border-2 border-gray-800 hover:border-purple-500 hover:bg-gray-800 transition-all flex flex-col items-center justify-center p-8 shadow-2xl"
        >
          <div className="bg-purple-900/30 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-16 h-16 text-purple-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-white mb-2">POS MODE</h2>
          <p className="text-gray-500 font-medium text-lg">Staff Order Entry</p>
        </Link>

        {/* 3. Admin Mode */}
        <Link 
          href="/admin" 
          className="group relative h-80 bg-gray-900 rounded-3xl border-2 border-gray-800 hover:border-green-500 hover:bg-gray-800 transition-all flex flex-col items-center justify-center p-8 shadow-2xl"
        >
          <div className="bg-green-900/30 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-16 h-16 text-green-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-white mb-2">ADMIN</h2>
          <p className="text-gray-500 font-medium text-lg">Menu & Sales</p>
        </Link>

      </div>
      
      <p className="text-gray-600 mt-10 text-sm">v1.0.0 - Collegiate Grill System</p>
    </div>
  );
}