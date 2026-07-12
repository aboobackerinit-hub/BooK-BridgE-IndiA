import React, { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Search, MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from "date-fns";

const ChatPage = () => {
  const { userId } = useParams();
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const bottomRef = useRef(null);

  const loadThreads = async () => {
    const { data } = await api.get("/chat/threads");
    setThreads(data);
  };

  useEffect(() => { loadThreads(); }, []);

  useEffect(() => {
    if (!userId) { setMessages([]); setOtherUser(null); return; }
    api.get(`/users/${userId}`).then((r) => setOtherUser(r.data));
    const load = async () => {
      const { data } = await api.get(`/chat/${userId}`);
      setMessages(data);
      api.post(`/chat/${userId}/read`).catch(() => {});
    };
    load();
    const iv = setInterval(load, 3000);
    return () => clearInterval(iv);
  }, [userId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !userId) return;
    await api.post("/chat", { to_user_id: userId, text });
    setText("");
    const { data } = await api.get(`/chat/${userId}`);
    setMessages(data);
    loadThreads();
  };

  const doSearch = async (v) => {
    setSearch(v);
    if (!v.trim()) { setSearchResults([]); return; }
    const { data } = await api.get("/users", { params: { q: v } });
    setSearchResults(data.filter((u) => u.id !== user.id));
  };

  return (
    <div>
      <div className="mb-4">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Community</div>
        <h1 className="font-serif text-4xl">Discussion</h1>
      </div>
      <Card className="grid grid-cols-1 md:grid-cols-3 min-h-[70vh] overflow-hidden">
        <div className="border-r border-border p-4 space-y-2 max-h-[70vh] overflow-y-auto">
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

        <div className="col-span-2 flex flex-col">
          {otherUser ? (
            <>
              <div className="p-4 border-b border-border flex items-center gap-3">
                <Avatar><AvatarFallback className="bg-primary/10 text-primary">{otherUser.name?.[0]}</AvatarFallback></Avatar>
                <div className="flex-1">
                  <Link to={`/profile/${otherUser.id}`} className="font-serif font-semibold hover:text-primary">{otherUser.name}</Link>
                  <div className="text-xs font-mono text-muted-foreground">{otherUser.bbid}</div>
                </div>
              </div>
              <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[55vh]" data-testid="chat-messages">
                {messages.map((m) => {
                  const mine = m.from_user_id === user.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] px-4 py-2 text-sm ${
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
              <div className="p-4 border-t border-border flex gap-2">
                <Input placeholder="Type a message..." value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()} className="rounded-full" data-testid="chat-input" />
                <Button onClick={send} className="rounded-full shrink-0" size="icon" data-testid="chat-send-btn"><Send className="w-4 h-4" /></Button>
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
