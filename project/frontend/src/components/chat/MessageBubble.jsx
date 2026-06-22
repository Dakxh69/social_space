function MessageBubble({ text, sent = false }) {
  const style = sent
    ? "self-end rounded-3xl rounded-br-md bg-sky-500 px-4 py-3 text-white shadow-lg shadow-sky-500/20"
    : "self-start rounded-3xl rounded-bl-md bg-white px-4 py-3 text-slate-700 shadow-sm ring-1 ring-sky-100";

  return <div className={`${style} max-w-[78%] text-sm leading-6`}>{text}</div>;
}

export default MessageBubble;
