import ConversationItem from "./ConversationItem";

function ChatList() {
  // BACKEND INTEGRATION POINT
  // conversations.map(chat => ...)

  const conversations = [
    { id: 1, name: "Alex", lastMessage: "Last message..." },
    { id: 2, name: "Rahul", lastMessage: "Last message..." },
    { id: 3, name: "Sarah", lastMessage: "Last message..." },
  ];

  return (
    <div className="glass-panel flex w-full flex-col border-r border-white/60 lg:w-[360px]">
      <div className="border-b border-sky-100/80 px-5 py-4">
        <h3 className="text-lg font-semibold text-slate-900">Chats</h3>
        <p className="text-sm text-slate-500">Recent conversations</p>
      </div>

      <div className="flex flex-col gap-3 p-3">
        {conversations.map((c) => (
          <ConversationItem
            key={c.id}
            name={c.name}
            lastMessage={c.lastMessage}
          />
        ))}
      </div>
    </div>
  );
}

export default ChatList;
