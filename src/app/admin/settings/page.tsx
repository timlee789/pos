"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isTableRequired, setIsTableRequired] = useState(true);

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
    // 가장 최근(또는 유일한) 설정 row 가져오기
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      setIsTableRequired(data.is_table_number_required);
    }
    setLoading(false);
  };

  // 2. 토글 변경 시 DB 업데이트
  const toggleTableSetting = async () => {
    const newValue = !isTableRequired;
    setIsTableRequired(newValue); // UI 즉시 반영

    // DB 업데이트 (id가 1인 row라고 가정하거나, 로직에 따라 처리)
    // 여기서는 가장 첫 번째 행을 업데이트한다고 가정합니다.
    // 실무에서는 id를 명확히 지정하는 것이 좋습니다.
    const { error } = await supabase
      .from('store_settings')
      .update({ is_table_number_required: newValue })
      .gt('id', 0); // 모든 id 대상 (보통 row가 1개뿐이므로)

    if (error) {
      alert("저장 실패: " + error.message);
      setIsTableRequired(!newValue); // 실패 시 원복
    }
  };

  if (loading) return <div className="p-10">Loading settings...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Store Settings</h1>

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h2 className="text-xl font-bold mb-4 border-b pb-2">Kiosk Options</h2>
        
        {/* 옵션 1: 테이블 번호 입력 여부 */}
        <div className="flex items-center justify-between py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Require Table Number</h3>
            <p className="text-gray-500 text-sm">
              If disabled, the Table Number modal will be skipped during checkout.
            </p>
          </div>
          
          {/* 토글 스위치 UI */}
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

        {/* 추후 여기에 다른 옵션들(팁 화면 등)을 계속 추가하면 됩니다 */}
        {/* <div className="flex items-center justify-between py-4 border-t">...</div> */}

      </div>
    </div>
  );
}