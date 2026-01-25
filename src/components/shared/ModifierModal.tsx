"use client";
import { useState } from 'react';
import { MenuItem, ModifierGroup, ModifierOption } from '@/lib/types';

interface Props {
  item: MenuItem;
  modifiersObj: { [key: string]: ModifierGroup };
  onClose: () => void;
  onConfirm: (item: MenuItem, selectedOptions: ModifierOption[]) => void;
}

export default function ModifierModal({ item, modifiersObj, onClose, onConfirm }: Props) {
  const [selectedOptions, setSelectedOptions] = useState<ModifierOption[]>([]);

  const toggleOption = (option: ModifierOption, groupName: string) => {
    const lowerItemName = item.name.toLowerCase();
    const lowerGroupName = groupName.toLowerCase();
    
    // 밀크쉐이크 관련 로직 유지
    const isMilkshake = lowerItemName.includes('milkshake');
    const isSingleSelectGroup = isMilkshake && (lowerGroupName.includes('size') || lowerGroupName.includes('flavor'));

    if (isSingleSelectGroup) {
      setSelectedOptions(prev => {
        // ✨ [안전장치 1] 옵션이 배열인지 확인
        const group = modifiersObj[groupName];
        const safeOptions = group && Array.isArray(group.options) ? group.options : [];
        
        const currentGroupOptionNames = safeOptions.map(o => o.name);
        const others = prev.filter(o => !currentGroupOptionNames.includes(o.name));
        return [...others, option];
      });
    } else {
      setSelectedOptions(prev => {
        const exists = prev.find(o => o.name === option.name);
        return exists ? prev.filter(o => o.name !== option.name) : [...prev, option];
      });
    }
  };

  const handleAddToCart = () => {
    const itemName = item.name.toLowerCase();

    // 밀크쉐이크 필수 선택 검사 로직 유지
    if (itemName.includes('milkshake')) {
      let hasSize = false;
      let hasFlavor = false;

      item.modifierGroups.forEach(groupName => {
        const group = modifiersObj[groupName];
        // ✨ [안전장치 2] 그룹과 옵션 유효성 검사
        if (!group || !Array.isArray(group.options)) return;

        const lowerGroupName = groupName.toLowerCase();
        const isSelectedInGroup = group.options.some(opt => 
          selectedOptions.some(selected => selected.name === opt.name)
        );

        if (lowerGroupName.includes('size') && isSelectedInGroup) hasSize = true;
        if (lowerGroupName.includes('flavor') && isSelectedInGroup) hasFlavor = true;
      });

      if (!hasSize) return alert("⚠️ Please select a Size.");
      if (!hasFlavor) return alert("⚠️ Please select a Flavor.");
    }

    onConfirm(item, selectedOptions);
  };

  const currentTotal = item.price + selectedOptions.reduce((sum, opt) => sum + opt.price, 0);

  // ✨ [안전장치 3] modifierGroups가 없으면 빈 배열 처리
  const safeModifierGroups = Array.isArray(item.modifierGroups) ? item.modifierGroups : [];

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* 모달 크기 */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 rounded-3xl w-[90%] h-auto max-h-[95vh] flex flex-col shadow-2xl overflow-hidden border border-gray-700"
      >

        {/* 헤더 */}
        <div className="p-6 border-b border-gray-700 bg-gray-800 flex justify-between items-center shrink-0">
          <div className="flex-1 pr-4">
            <h2 className="text-3xl font-black text-white leading-tight">{item.name}</h2>
            <p className="text-gray-400 text-lg mt-1 font-medium">Select options</p>
          </div>
          
          <div className="flex items-center gap-5">
            <span className="text-3xl text-blue-400 font-black">${currentTotal.toFixed(2)}</span>
            
            <button 
              onClick={onClose}
              className="bg-gray-700 p-3 rounded-full hover:bg-gray-600 transition-colors shadow-sm text-gray-300 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 옵션 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-900">
          {safeModifierGroups.length === 0 && (
            <p className="text-center text-gray-500 py-10 text-2xl">No options available.</p>
          )}

          {safeModifierGroups.map((groupName, idx) => {
            const group = modifiersObj[groupName];
            
            // ✨✨ [핵심 수정] 그룹이 없거나, options가 배열이 아니면 렌더링하지 않음 (에러 방지)
            if (!group || !Array.isArray(group.options) || group.options.length === 0) {
                return null;
            }

            // sort 할 때도 원본 배열을 복사([...])해서 안전하게 처리
            const sortedOptions = [...group.options].sort((a: any, b: any) => {
              return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
            });

            return (
              <div key={`${groupName}-${idx}`}>
                {/* 그룹 제목 */}
                <h3 className="text-2xl font-bold mb-5 text-gray-200 border-l-4 border-blue-500 pl-4 uppercase tracking-wide">
                  {groupName}
                </h3>
                
                {/* Grid Layout */}
                <div className="grid grid-cols-4 xl:grid-cols-5 gap-4">
                  {sortedOptions.map((option, optIdx) => {
                    const isSelected = selectedOptions.some(o => o.name === option.name);
                    return (
                      <div
                        key={`${option.name}-${optIdx}`}
                        onClick={() => toggleOption(option, groupName)}
                        className={`flex flex-col items-center justify-center text-center p-3 border rounded-2xl cursor-pointer transition-all active:scale-95 h-44 relative overflow-hidden
                          ${isSelected
                            ? 'bg-blue-900/40 border-blue-500 ring-2 ring-blue-500 shadow-lg shadow-blue-900/20'
                            : 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-500'
                          }`}
                      >
                        {/* 체크박스 UI */}
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mb-3 shrink-0 transition-colors
                          ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-gray-500'}`}
                        >
                          {isSelected && <div className="w-3.5 h-3.5 bg-white rounded-full" />}
                        </div>
                        
                        <div className="flex flex-col items-center w-full px-1">
                          <span className={`text-2xl font-black leading-tight break-words w-full ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                            {option.name}
                          </span>
                          
                          {option.price > 0 && (
                            <span className="text-xl text-blue-400 font-bold mt-2 bg-gray-900/50 px-2 py-0.5 rounded-md">
                              +${option.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 버튼 */}
        <div className="p-6 border-t border-gray-700 bg-gray-800 flex gap-5 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.3)]">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 text-gray-300 text-2xl font-bold rounded-2xl h-24 hover:bg-gray-600 transition-colors border border-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleAddToCart}
            className="flex-[2] bg-blue-600 text-white text-3xl font-black rounded-2xl h-24 hover:bg-blue-500 shadow-lg shadow-blue-900/50 transition-colors flex items-center justify-center gap-3"
          >
            Add to Order <span className="text-blue-200 text-2xl font-semibold opacity-80">| ${currentTotal.toFixed(2)}</span>
          </button>
        </div>

      </div>
    </div>
  );
}