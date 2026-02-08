"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  
  // 설정 상태값들
  const [isTableRequired, setIsTableRequired] = useState(true);
  const [enableReaderTipping, setEnableReaderTipping] = useState(false); // ✨ 새로 추가된 설정

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. 페이지 로드 시 현재 설정 가져오기
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      setIsTableRequired(data.is_table_number_required);
      // ✨ DB에 있는 값 불러오기 (없으면 false)
      setEnableReaderTipping(data.enable_on_reader_tipping || false); 
    }
    setLoading(false);
  };

  // 2-1. 테이블 번호 토글
  const toggleTableSetting = async () => {
    const newValue = !isTableRequired;
    setIsTableRequired(newValue); 
    const { error } = await supabase
      .from('store_settings')
      .update({ is_table_number_required: newValue })
      .gt('id', 0);
    if (error) { alert("저장 실패: " + error.message); setIsTableRequired(!newValue); }
  };

  // 2-2. ✨ 리더기 팁 모드 토글 (새로 추가됨)
  const toggleReaderTipping = async () => {
    const newValue = !enableReaderTipping;
    setEnableReaderTipping(newValue); // UI 즉시 반영

    const { error } = await supabase
      .from('store_settings')
      .update({ enable_on_reader_tipping: newValue })
      .gt('id', 0);

    if (error) {
      alert("저장 실패: " + error.message);
      setEnableReaderTipping(!newValue); // 실패 시 원복
    }
  };

  if (loading) return <div className="p-10">Loading settings...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Store Settings</h1>

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 divide-y divide-gray-100">
        <h2 className="text-xl font-bold mb-4 pb-2">Kiosk Options</h2>
        
        {/* 옵션 1: 테이블 번호 입력 여부 */}
        <div className="flex items-center justify-between py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Require Table Number</h3>
            <p className="text-gray-500 text-sm">
              If disabled, the Table Number modal will be skipped.
            </p>
          </div>
          <button
            onClick={toggleTableSetting}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isTableRequired ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                isTableRequired ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* ✨ 옵션 2: 팁 받기 방식 설정 (새로 추가됨) */}
        <div className="flex items-center justify-between py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Enable Reader Tipping (S700)</h3>
            <p className="text-gray-500 text-sm">
              <span className="font-bold text-blue-600">ON:</span> Use Stripe Reader (S700) for tipping. (Skip tip screen on POS)<br/>
              <span className="font-bold text-gray-500">OFF:</span> Use POS Screen for tipping.
            </p>
          </div>
          <button
            onClick={toggleReaderTipping}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              enableReaderTipping ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                enableReaderTipping ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

      </div>
    </div>
  );
}