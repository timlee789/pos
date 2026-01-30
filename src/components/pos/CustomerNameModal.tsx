'use client';

import { useState, useRef } from 'react';
// ✨ 가상 키보드 임포트
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';

interface Props {
  onClose: () => void;
  onConfirm: (name: string) => void;
}

export default function CustomerNameModal({ onClose, onConfirm }: Props) {
  const [name, setName] = useState('');
  const [layoutName, setLayoutName] = useState("default");
  const keyboard = useRef(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return alert("Please enter a name.");
    onConfirm(name.trim());
  };

  // 키보드 입력 핸들러
  const onChange = (input: string) => {
    setName(input);
  };

  const onKeyPress = (button: string) => {
    if (button === "{shift}" || button === "{lock}") {
      setLayoutName(layoutName === "default" ? "shift" : "default");
    }
    if (button === "{enter}") {
        handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      {/* ✨ 너비를 좀 더 넓게 수정 (max-w-3xl) */}
      <div className="bg-gray-900 rounded-2xl w-full max-w-3xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* 헤더 */}
        <div className="bg-gray-800 p-6 border-b border-gray-700 shrink-0">
          <h2 className="text-3xl font-black text-white">📞 Phone Order</h2>
          <p className="text-gray-400 mt-1">Enter Customer Name for To Go</p>
        </div>

        {/* 입력 폼 & 키보드 */}
        <div className="p-8 flex-1 overflow-y-auto">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => {
                setName(e.target.value);
                // @ts-ignore
                keyboard.current?.setInput(e.target.value);
            }}
            placeholder="e.g. John Doe"
            className="w-full bg-gray-950 text-white text-3xl font-bold p-5 rounded-xl border-2 border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-600 mb-6"
          />

          {/* ✨ 가상 키보드 */}
          <div className="text-gray-900 mb-6">
             <Keyboard
                keyboardRef={r => (keyboard.current = r)}
                layoutName={layoutName}
                onChange={onChange}
                onKeyPress={onKeyPress}
                input={name}
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
                    "{enter}": "CONFIRM",
                    "{shift}": "⇧",
                    "{space}": "SPACE",
                  }}
                  buttonTheme={[
                    {
                        class: "hg-purple",
                        buttons: "{enter}"
                    }
                  ]}
              />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xl font-bold py-5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit()}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xl font-bold py-5 rounded-xl shadow-lg shadow-purple-900/30 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>

      {/* 키보드 스타일 (Dark Mode용) */}
      <style jsx global>{`
        .hg-theme-default {
            background-color: #374151; /* gray-700 */
            padding: 10px;
            border-radius: 10px;
            color: black;
        }
        .hg-button {
            height: 60px !important;
            font-weight: bold !important;
            font-size: 1.2rem !important;
            background-color: #e5e7eb !important; /* gray-200 */
            color: #1f2937 !important; /* gray-800 */
        }
        /* 특수 버튼 색상 */
        .hg-purple { 
            background: #9333ea !important; /* purple-600 */ 
            color: white !important; 
        }
      `}</style>
    </div>
  );
}