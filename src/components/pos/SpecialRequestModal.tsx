"use client";
import { useState, useRef } from 'react';
// ✨ 가상 키보드 임포트
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';

interface Props {
  initialNote: string;
  onClose: () => void;
  onConfirm: (note: string) => void;
}

export default function SpecialRequestModal({ initialNote, onClose, onConfirm }: Props) {
  const [note, setNote] = useState(initialNote || "");
  const [layoutName, setLayoutName] = useState("default"); // Shift 키 상태 관리
  const keyboard = useRef(null);

  const onChange = (input: string) => {
    setNote(input);
  };

  const onKeyPress = (button: string) => {
    // Shift 키 처리
    if (button === "{shift}" || button === "{lock}") {
      setLayoutName(layoutName === "default" ? "shift" : "default");
    }
    // Enter 키 처리 (저장)
    if (button === "{enter}") {
        onConfirm(note);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center backdrop-blur-sm">
      {/* ✨ 키보드를 위해 너비를 800px로 늘림 */}
      <div className="bg-white w-[800px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* 헤더 */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center shrink-0">
          <h2 className="text-2xl font-bold">Special Instruction</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white text-4xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-4">
          <label className="block text-gray-500 font-bold text-lg">
            Enter request for Kitchen:
          </label>
          
          <textarea
            className="w-full h-32 p-4 text-2xl border-2 border-gray-300 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none resize-none font-bold text-gray-800 placeholder-gray-300 leading-relaxed"
            placeholder="Type here..."
            value={note}
            onChange={(e) => {
                setNote(e.target.value);
                // 물리 키보드 입력 시 가상 키보드 동기화
                // @ts-ignore
                keyboard.current?.setInput(e.target.value);
            }}
            autoFocus 
          />

          {/* ✨ 가상 키보드 영역 */}
          <div className="mt-2 text-black">
              <Keyboard
                keyboardRef={r => (keyboard.current = r)}
                layoutName={layoutName}
                onChange={onChange}
                onKeyPress={onKeyPress}
                input={note} // 현재 입력값 동기화
                theme={"hg-theme-default hg-layout-default myTheme"}
                layout={{
                    default: [
                      "1 2 3 4 5 6 7 8 9 0 - = {bksp}",
                      "q w e r t y u i o p [ ] \\",
                      "a s d f g h j k l ; ' {enter}",
                      "{shift} z x c v b n m , . / {shift}",
                      "{space}"
                    ],
                    shift: [
                      "! @ # $ % ^ & * ( ) _ + {bksp}",
                      "Q W E R T Y U I O P { } |",
                      "A S D F G H J K L : \" {enter}",
                      "{shift} Z X C V B N M < > ? {shift}",
                      "{space}"
                    ]
                  }}
                  display={{
                    "{bksp}": "⌫",
                    "{enter}": "SAVE",
                    "{shift}": "⇧",
                    "{space}": "SPACE",
                  }}
                  buttonTheme={[
                    {
                      class: "hg-red",
                      buttons: "{bksp}"
                    },
                    {
                        class: "hg-blue",
                        buttons: "{enter}"
                    }
                  ]}
              />
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-4 shrink-0">
          <button 
            onClick={onClose} 
            className="flex-1 py-4 bg-white border-2 border-gray-300 rounded-xl text-xl font-bold text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(note)} 
            className="flex-1 py-4 bg-blue-600 text-white rounded-xl text-xl font-bold hover:bg-blue-700 shadow-md active:scale-95 transition-all"
          >
            Save Note
          </button>
        </div>
      </div>
      
      {/* 키보드 스타일 커스텀 (필요시) */}
      <style jsx global>{`
        .hg-theme-default {
            background-color: #f3f4f6;
            padding: 10px;
            border-radius: 10px;
        }
        .hg-button {
            height: 60px !important; /* 버튼 높이 키움 */
            font-weight: bold !important;
            font-size: 1.2rem !important;
        }
        .hg-blue { background: #2563eb !important; color: white !important; }
        .hg-red { background: #ef4444 !important; color: white !important; }
      `}</style>
    </div>
  );
}