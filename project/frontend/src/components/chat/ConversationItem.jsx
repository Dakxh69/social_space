function ConversationItem({ name, lastMessage }) {
  return (
    <div className="flex cursor-pointer gap-3 rounded-2xl px-4 py-3 transition hover:bg-sky-50">
      <div className="h-11 w-11 flex-shrink-0 rounded-full bg-gradient-to-br from-sky-200 to-cyan-200 ring-4 ring-white" />

      <div>
        <strong className="text-sm font-semibold text-slate-900">{name}</strong>

        <p className="m-0 text-sm text-slate-500">
          {lastMessage}
        </p>
      </div>
    </div>
  );
}

export default ConversationItem;
