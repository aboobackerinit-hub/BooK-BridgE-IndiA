import React, { useEffect, useState, useRef, useCallback } from "react";
import api from "@/lib/api";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Search, MessageCircle, ArrowDown, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from "date-fns";

const sortMessages = (list) => {
  return [...list].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : Infinity;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : Infinity;
    if (isNaN(timeA) || timeA === Infinity) return 1;
    if (isNaN(timeB) || timeB === Infinity) return -1;
    return timeA - timeB;
  });
};

const ChatPage = () => {
  const { userId } = useParams();
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [hasUnreadBelow, setHasUnreadBelow] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const sendingRef = useRef(false);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesContainerRef.current) {
      const el = messagesContainerRef.current;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    } else if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }
    isNearBottomRef.current = true;
    setHasUnreadBelow(false);
  }, []);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 90;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) {
      setHasUnreadBelow(false);
    }
  };

  const loadThreads = async () => {
    try {
      const { data } = await api.get("/chat/threads");
      setThreads(data);
    } catch (err) {
      console.error("Failed to load threads", err);
    }
  };

  useEffect(() => { loadThreads(); }, []);

  useEffect(() => {
    if (!userId) {
      setMessages([]);
      setOtherUser(null);
      setHasUnreadBelow(false);
      return;
    }

    setMessages([]);
    setHasUnreadBelow(false);
    isNearBottomRef.current = true;

    api.get(`/users/${userId}`).then((r) => setOtherUser(r.data)).catch(() => {});

    const load = async () => {
      try {
        const { data } = await api.get(`/chat/${userId}`);
        const sorted = sortMessages(data);

        setMessages((prev) => {
          if (prev.length > 0 && sorted.length > prev.length && !isNearBottomRef.current) {
            setHasUnreadBelow(true);
          }
          return sorted;
        });

        api.post(`/chat/${userId}/read`).catch(() => {});
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };

    load().then(() => {
      setTimeout(() => scrollToBottom(false), 50);
    });

    const iv = setInterval(load, 3000);
    return () => clearInterval(iv);
  }, [userId, scrollToBottom]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || !userId || sendingRef.current) return;
    sendingRef.current = true;
    setText("");

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      from_user_id: user.id,
      to_user_id: userId,
      text: trimmed,
      created_at: new Date().toISOString(),
      pending: true,
    };

    setMessages((prev) => sortMessages([...prev, optimisticMsg]));
    setTimeout(() => scrollToBottom(true), 30);

    try {
      const { data: sentMsg } = await api.post("/chat", { to_user_id: userId, text: trimmed });
      setMessages((prev) =>
        sortMessages(
          prev.map((m) => (m.id === tempId ? { ...sentMsg, id: sentMsg.id || tempId } : m))
        )
      );
      loadThreads();
    } catch (err) {
      console.error("Failed to send message", err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      sendingRef.current = false;
    }
  };

  const doSearch = async (v) => {
    setSearch(v);
    if (!v.trim()) { setSearchResults([]); return; }
    try {
      const { data } = await api.get("/users", { params: { q: v } });
      setSearchResults(data.filter((u) => u.id !== user.id));
    } catch {
      setSearchResults([]);
    }
  };

  return (
    <div>
      <div className="mb-4 hidden md:block">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Community</div>
        <h1 className="font-serif text-4xl">Discussion</h1>
      </div>
      <Card className="grid grid-cols-1 md:grid-cols-3 min-h-[75vh] md:min-h-[70vh] overflow-hidden">
        <div className={`border-r border-border p-4 space-y-2 max-h-[75vh] md:max-h-[70vh] overflow-y-auto ${userId ? "hidden md:block" : "block"}`}>
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Find by name or BBID" value={search} onChange={(e) => doSearch(e.target.value)} className="pl-9 rounded-full h-9" data-testid="chat-search-input" />
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-1 mb-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2">Search results</div>
              {searchResults.map((u) => (
                <button key={u.id} onClick={() => { navigate(`/chat/${u.id}`); setSearch(""); setSearchResults([]); }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-left" data-testid={`search-user-${u.id}`}>
                  <Avatar className="w-8 h-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{u.name?.[0]}</AvatarFallback></Avatar>
                  <div>
                    <div className="text-sm font-medium">{u.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{u.bbid}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2">Conversations</div>
          {threads.length === 0 && <div className="text-sm text-muted-foreground p-4 text-center">No conversations yet</div>}
          {threads.map((t) => (
            <button key={t.thread_id} onClick={() => navigate(`/chat/${t.other_user.id}`)}
              className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${userId === t.other_user.id ? "bg-primary/10" : "hover:bg-muted"}`}
              data-testid={`thread-${t.other_user.id}`}>
              <Avatar><AvatarFallback className="bg-primary/10 text-primary">{t.other_user.name?.[0]}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.other_user.name}</div>
                <div className="text-xs text-muted-foreground truncate">{t.last_message}</div>
              </div>
            </button>
          ))}
        </div>

        <div className={`col-span-2 flex flex-col relative h-[75vh] md:h-auto ${!userId ? "hidden md:flex" : "flex"}`}>
          {otherUser ? (
            <>
              <div className="p-4 border-b border-border flex items-center gap-3 bg-background/50">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => navigate('/chat')} data-testid="chat-back-btn">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Avatar><AvatarFallback className="bg-primary/10 text-primary">{otherUser.name?.[0]}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${otherUser.id}`} className="font-serif font-semibold hover:text-primary truncate block">{otherUser.name}</Link>
                  <div className="text-xs font-mono text-muted-foreground">{otherUser.bbid}</div>
                </div>
              </div>

              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[55vh]"
                data-testid="chat-messages"
              >
                {messages.map((m) => {
                  const mine = m.from_user_id === user.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] md:max-w-[70%] px-4 py-2 text-sm ${
                        mine
                          ? "bg-primary text-primary-foreground rounded-l-2xl rounded-tr-2xl"
                          : "bg-muted text-foreground rounded-r-2xl rounded-tl-2xl"
                      }`}>
                        <div>{m.text}</div>
                        <div className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {(() => { try { return formatDistanceToNow(new Date(m.created_at), { addSuffix: true }); } catch { return ""; } })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {hasUnreadBelow && (
                <div className="absolute bottom-16 right-6 z-10 animate-fade-in">
                  <Button
                    onClick={() => scrollToBottom(true)}
                    size="sm"
                    className="rounded-full shadow-lg bg-primary text-primary-foreground text-xs gap-1 font-medium hover:opacity-90"
                  >
                    New messages <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              <div className="p-3 md:p-4 border-t border-border flex gap-2 bg-background sticky bottom-0 z-20">
                <Input placeholder="Type a message..." value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()} className="rounded-full h-10" data-testid="chat-input" />
                <Button onClick={send} className="rounded-full shrink-0 h-10 w-10" size="icon" data-testid="chat-send-btn"><Send className="w-4 h-4" /></Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center">
              <div>
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a conversation or search for a user by BBID.</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ChatPage;

