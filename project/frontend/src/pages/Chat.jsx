import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Send, Search, MessageSquare, Loader2, ArrowLeft } from "lucide-react";
import {
  getConversations,
  startConversation,
  getMessages,
  sendMessage,
  markConversationAsRead,
} from "../services/chatService";
import { searchUsers } from "../services/userService";

function Chat() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth.user);

  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  
  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Loading/error states
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState("");

  // WebSocket typing states
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const selectedChatRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const userTypingTimeoutRef = useRef(null);

  // Load all conversations
  const loadConversations = async (selectId = null) => {
    try {
      const data = await getConversations();
      setConversations(data);
      if (selectId) {
        const chat = data.find((c) => c.conversation_id === selectId);
        if (chat) setSelectedChat(chat);
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
      setError("Could not load conversations");
    } finally {
      setConversationsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    const initChat = async () => {
      setConversationsLoading(true);
      setError("");

      const startWithUser = location.state?.startWithUser;
      if (startWithUser) {
        try {
          // Clear state so we don't repeat this on re-render
          window.history.replaceState({}, document.title);
          
          const result = await startConversation(startWithUser.id);
          const newConvId = result.conversation_id;
          
          await loadConversations(newConvId);
        } catch (err) {
          console.error("Failed to start conversation", err);
          setError("Failed to start conversation");
          await loadConversations();
        }
      } else {
        await loadConversations();
      }
    };

    if (currentUser?.id) {
      initChat();
    }
  }, [location.state, currentUser?.id]);

  // Load messages for selected chat
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        const data = await getMessages(selectedChat.conversation_id);
        setMessages(data.messages || []);
      } catch (err) {
        console.error("Failed to load messages", err);
      }
    };

    fetchMessages();
  }, [selectedChat]);

  // WebSocket Connection
  useEffect(() => {
    if (!currentUser?.id) return;

    const connectWS = () => {
      const wsUrl = `ws://localhost:8000/ws/${currentUser.id}`;
      console.log("Connecting WebSocket to", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected successfully");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // 1. Typing Indication handling
          if (data.type === "typing") {
            const currentSelected = selectedChatRef.current;
            if (currentSelected && String(data.user_id) === String(currentSelected.other_user.id)) {
              setIsOtherUserTyping(true);
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = setTimeout(() => {
                setIsOtherUserTyping(false);
              }, 5000);
            }
            return;
          }

          if (data.type === "stop_typing") {
            const currentSelected = selectedChatRef.current;
            if (currentSelected && String(data.user_id) === String(currentSelected.other_user.id)) {
              setIsOtherUserTyping(false);
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            }
            return;
          }

          // 2. Chat Message handling
          if (data.conversation_id && data.content) {
            const currentSelected = selectedChatRef.current;
            
            // If the message belongs to the open chat
            if (currentSelected && currentSelected.conversation_id === data.conversation_id) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === data.id)) return prev;
                return [...prev, data];
              });

              // Mark as read in backend if someone else sent it
              if (String(data.sender_id) !== String(currentUser.id)) {
                markConversationAsRead(data.conversation_id).catch((err) =>
                  console.error("Failed to auto-mark message as read", err)
                );
              }
            }

            // Update conversations list items
            setConversations((prevList) => {
              const updated = prevList.map((chat) => {
                if (chat.conversation_id === data.conversation_id) {
                  const isCurrentSelected = currentSelected && currentSelected.conversation_id === data.conversation_id;
                  const isSentByMe = String(data.sender_id) === String(currentUser.id);

                  return {
                    ...chat,
                    Last_message: data.content,
                    last_message_time: data.created_at,
                    unread_count: (!isCurrentSelected && !isSentByMe)
                      ? (chat.unread_count || 0) + 1
                      : 0,
                  };
                }
                return chat;
              });

              // Sort by newest last message time
              return [...updated].sort((a, b) => {
                const timeA = new Date(a.last_message_time || 0);
                const timeB = new Date(b.last_message_time || 0);
                return timeB - timeA;
              });
            });
          }
        } catch (err) {
          console.error("Error parsing WebSocket message data", err);
        }
      };

      ws.onclose = (e) => {
        console.log("WebSocket disconnected. Reconnecting in 3 seconds...", e.reason);
        setTimeout(connectWS, 3000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket encountered error:", err);
        ws.close();
      };
    };

    connectWS();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [currentUser?.id]);

  // Keep selectedChatRef updated and handle read/unread state on selection
  useEffect(() => {
    selectedChatRef.current = selectedChat;
    if (selectedChat) {
      setIsOtherUserTyping(false);
      markConversationAsRead(selectedChat.conversation_id)
        .then(() => {
          setConversations((prev) =>
            prev.map((c) =>
              c.conversation_id === selectedChat.conversation_id
                ? { ...c, unread_count: 0 }
                : c
            )
          );
        })
        .catch((err) => console.error("Failed to mark as read on selection", err));
    }
  }, [selectedChat]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOtherUserTyping]);

  // Typing state input change handler
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    if (!selectedChat || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      wsRef.current.send(
        JSON.stringify({
          type: "typing",
          receiver_id: selectedChat.other_user.id,
        })
      );
    }

    if (userTypingTimeoutRef.current) clearTimeout(userTypingTimeoutRef.current);
    userTypingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        isTypingRef.current = false;
        wsRef.current.send(
          JSON.stringify({
            type: "stop_typing",
            receiver_id: selectedChat.other_user.id,
          })
        );
      }
    }, 1500);
  };

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const text = newMessage.trim();
    setNewMessage("");

    // Stop typing indication immediately
    if (isTypingRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      isTypingRef.current = false;
      wsRef.current.send(
        JSON.stringify({
          type: "stop_typing",
          receiver_id: selectedChat.other_user.id,
        })
      );
    }
    if (userTypingTimeoutRef.current) clearTimeout(userTypingTimeoutRef.current);

    // Send via WebSocket if open
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          receiver_id: selectedChat.other_user.id,
          conversation_id: selectedChat.conversation_id,
          content: text,
        })
      );
    } else {
      // HTTP fallback
      setSendingMessage(true);
      try {
        const response = await sendMessage(selectedChat.conversation_id, text);
        if (response?.data) {
          setMessages((prev) => [...prev, response.data]);

          setConversations((prevList) => {
            const updated = prevList.map((chat) =>
              chat.conversation_id === selectedChat.conversation_id
                ? {
                    ...chat,
                    Last_message: response.data.content,
                    last_message_time: response.data.created_at,
                  }
                : chat
            );
            return [...updated].sort((a, b) => {
              const timeA = new Date(a.last_message_time || 0);
              const timeB = new Date(b.last_message_time || 0);
              return timeB - timeA;
            });
          });
        }
      } catch (err) {
        console.error("Failed to send message via HTTP", err);
        setError("Failed to send message");
      } finally {
        setSendingMessage(false);
      }
    }
  };

  // Search users to start new chat
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchUsers(searchQuery);
        setSearchResults(results.filter((u) => u.id !== currentUser?.id));
      } catch (err) {
        console.error("Failed to search users", err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, currentUser]);

  // Handle start chat from search result
  const handleStartChatFromSearch = async (user) => {
    setSearchQuery("");
    setSearchResults([]);
    setConversationsLoading(true);

    try {
      const result = await startConversation(user.id);
      await loadConversations(result.conversation_id);
    } catch (err) {
      console.error("Failed to start conversation from search", err);
      setError("Failed to start conversation");
      setConversationsLoading(false);
    }
  };

  // Profile Image helper with fallback initials
  const getProfileImage = (user) => {
    if (user?.profile_picture) return user.profile_picture;
    const name = user?.username || user?.name || "U";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e0f2fe&color=0284c7&bold=true`;
  };

  return (
    <div className="w-full h-[calc(100vh-2rem)]">
      <div className="soft-card flex h-full overflow-hidden bg-white">
        
        {/* Left Sidebar - Conversation List */}
        <div 
          onClick={() => {
            if (selectedChat) {
              setSelectedChat(null);
            }
          }}
          className={`flex w-full flex-shrink-0 flex-col border-r border-sky-100 transition-all duration-300 ${
            selectedChat 
              ? "hidden md:flex md:w-20 cursor-pointer hover:bg-slate-50/50" 
              : "flex md:w-80 lg:w-96"
          }`}
        >
          <div className={`border-b border-sky-50 p-4 flex flex-col ${selectedChat ? "items-center" : ""}`}>
            {!selectedChat ? (
              <>
                <h2 className="text-xl font-bold text-slate-900">Messages</h2>
                <p className="text-xs text-slate-500">Connect with other users</p>
                
                {/* Search users */}
                <div className="relative mt-3">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search people to chat..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field py-2 pl-9 pr-4 text-sm rounded-2xl w-full"
                  />
                </div>
              </>
            ) : (
              // Compressed Sidebar Header Icon
              <div className="flex h-10 items-center justify-center text-sky-500" title="Click to expand list">
                <MessageSquare className="h-6 w-6" />
              </div>
            )}
          </div>

          {/* Search Results / Conversation List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {searchQuery.trim() ? (
              // Search Results
              <div>
                {!selectedChat && (
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Search Results
                  </p>
                )}
                {searching ? (
                  <div className="flex items-center justify-center p-6 text-sky-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-6">No users found.</p>
                ) : (
                  searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartChatFromSearch(user);
                      }}
                      className={`flex items-center rounded-2xl transition ${
                        selectedChat 
                          ? "justify-center p-2.5 w-12 mx-auto" 
                          : "w-full gap-3 px-3 py-2 text-left"
                      } hover:bg-sky-50`}
                      title={user.name}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 flex-shrink-0 text-white font-bold text-sm">
                        {user.name ? user.name.slice(0, 1).toUpperCase() : "U"}
                      </div>
                      {!selectedChat && (
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                          <p className="text-xs text-sky-500">Click to chat</p>
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            ) : (
              // Conversations List
              <div>
                {!selectedChat && (
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Recent Chats
                  </p>
                )}
                {conversationsLoading ? (
                  <div className="flex items-center justify-center p-8 text-sky-500">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                    <MessageSquare className="h-8 w-8 text-slate-300 mb-2" />
                    {!selectedChat && (
                      <>
                        <p className="text-sm">No chats yet</p>
                        <p className="text-xs text-slate-400 mt-1">Search users above to start messaging</p>
                      </>
                    )}
                  </div>
                ) : (
                  conversations.map((chat) => {
                    const isSelected = selectedChat?.conversation_id === chat.conversation_id;
                    const hasUnread = chat.unread_count > 0;
                    return (
                      <button
                        key={chat.conversation_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedChat(chat);
                        }}
                        className={`flex items-center rounded-2xl transition ${
                          selectedChat 
                            ? "justify-center p-2.5 w-12 mx-auto" 
                            : "w-full gap-3 px-3 py-2.5 text-left"
                        } ${
                          isSelected ? "bg-sky-50/80 ring-1 ring-sky-100" : "hover:bg-slate-50"
                        }`}
                        title={chat.other_user?.username || "Chat"}
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={getProfileImage(chat.other_user)}
                            alt={chat.other_user?.username}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                          {chat.other_user?.is_online && (
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-500/10" />
                          )}
                          {selectedChat && hasUnread && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[8px] font-bold text-white shadow-sm ring-1 ring-white">
                              {chat.unread_count}
                            </span>
                          )}
                        </div>
                        {!selectedChat && (
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {chat.other_user?.username || "User"}
                              </p>
                              {hasUnread && (
                                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-white shadow-sm shadow-sky-500/20">
                                  {chat.unread_count}
                                </span>
                              )}
                            </div>
                            <p className={`text-xs truncate ${hasUnread ? "text-slate-800 font-semibold" : "text-slate-400"}`}>
                              {chat.Last_message || "Click to view messages"}
                            </p>
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Active Chat Pane */}
        <div className={`flex flex-1 min-w-0 flex-col bg-slate-50/30 ${!selectedChat ? "hidden md:flex" : "flex"}`}>
          {selectedChat ? (
            <>
              {/* Active Chat Header */}
              <div className="flex items-center gap-3 border-b border-sky-50 bg-white p-4">
                <button
                  onClick={() => setSelectedChat(null)}
                  className="rounded-xl p-1.5 hover:bg-slate-100 transition md:hidden"
                >
                  <ArrowLeft className="h-5 w-5 text-slate-600" />
                </button>
                <img
                  src={getProfileImage(selectedChat.other_user)}
                  alt={selectedChat.other_user?.username}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {selectedChat.other_user?.username || "Chat"}
                  </h4>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${isOtherUserTyping ? "text-sky-500 animate-pulse" : "text-emerald-500"}`}>
                    {isOtherUserTyping ? "typing..." : "Active conversation"}
                  </p>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto bg-gradient-to-b from-sky-50/30 to-white p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-slate-400">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm font-medium">Say hello to {selectedChat.other_user?.username}!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isSentByMe = String(message.sender_id) === String(currentUser?.id);
                    return (
                      <div
                        key={message.id}
                        className={`flex flex-col max-w-[75%] ${isSentByMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                      >
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isSentByMe
                              ? "rounded-tr-none bg-sky-500 text-white shadow-md shadow-sky-500/10"
                              : "rounded-tl-none bg-white text-slate-700 shadow-sm border border-sky-100/50"
                          }`}
                        >
                          {message.content}
                        </div>
                        <span className="mt-1 text-[9px] text-slate-400 px-1">
                          {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                        </span>
                      </div>
                    );
                  })
                )}
                {isOtherUserTyping && (
                  <div className="flex flex-col mr-auto items-start max-w-[75%]">
                    <div className="rounded-2xl rounded-tl-none bg-white text-slate-400 shadow-sm border border-sky-100/50 px-4 py-2.5 text-xs font-semibold animate-pulse flex items-center gap-1.5">
                      <span>typing</span>
                      <span className="flex gap-0.5">
                        <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSendMessage} className="border-t border-sky-50 bg-white p-4">
                {error && <p className="mb-2 text-xs text-rose-500">{error}</p>}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={handleInputChange}
                    className="input-field flex-1 py-3 px-4 text-sm rounded-full"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage}
                    className="primary-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-0 shadow-lg shadow-sky-500/10"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            // No selected chat empty state
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-500 mb-4 ring-8 ring-sky-50/50 animate-bounce">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Your Inbox</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Select an existing conversation from the list, or search for a user to start messaging.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Chat;