import { useState } from "react";

function MessageInput({ onSend }) {
  // BACKEND INTEGRATION POINT
  // sendMessage()

  const [value, setValue] = useState("");

  const send = () => {
    if (!value.trim()) return;
    if (onSend) onSend(value.trim());
    setValue("");
  };

  return (
    <div className="glass-panel border-t border-white/60 px-4 py-4">
      <div className="flex items-center gap-3">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          type="text"
          placeholder="Type a message..."
          className="input-field flex-1 rounded-full px-5 py-4 text-sm"
        />

        <button
          onClick={send}
          className="primary-btn h-12 w-12 shrink-0 rounded-full px-0 py-0 text-base"
        >
          ➤
        </button>
      </div>
    </div>
  );
}

export default MessageInput;
