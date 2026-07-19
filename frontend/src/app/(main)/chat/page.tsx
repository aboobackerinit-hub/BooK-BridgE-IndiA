"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { db } from "@/lib/firebase/config";
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, serverTimestamp, getDocs, limit, or
} from "firebase/firestore";
import apiClient from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Image as ImageIcon, BookOpen, User } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: any;
  book_id?: string;
}

interface ChatContact {
  id: string;
  name: string;
  lastMessage?: string;
  timestamp?: any;
}

function ChatPageContent() {
  const searchParams = useSearchParams();
  const targetUserId = searchParams?.get("userId");
  const linkedBookId = searchParams?.get("bookId");
  
  const { user, dbUser } = useAuthStore();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [activeContact, setActiveContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize target user if coming from book details
  useEffect(() => {
    if (targetUserId && user) {
      // Fetch target user details to add to contacts
      apiClient.get(`/users/${targetUserId}`).then((res) => {
        const newContact = { id: res.data.id, name: res.data.name };
        setActiveContact(newContact);
        setContacts(prev => {
          if (!prev.find(c => c.id === newContact.id)) return [newContact, ...prev];
          return prev;
        });
      }).catch(err => console.error("Failed to fetch target user", err));
    }
  }, [targetUserId, user]);

  // Subscribe to messages with active contact
  useEffect(() => {
    if (!user || !activeContact) return;

    // We query messages where the user is either sender or receiver, AND the active contact is the other party.
    // Firestore requires composite indexes for OR queries with multiple fields, so a simpler approach is fetching 
    // all messages between these two users (sender == me AND receiver == them) OR (sender == them AND receiver == me).
    
    // In Firebase v9+, you can use the 'or' helper, but it still requires indexes. 
    // For this UI mockup, we'll listen to a generic 'chats' collection and filter in memory, 
    // or use a structured conversation ID like `${min(id1, id2)}_${max(id1, id2)}`.

    const conversationId = [user.uid, activeContact.id].sort().join('_');
    const q = query(
      collection(db, "chats"), 
      where("conversationId", "==", conversationId),
      orderBy("created_at", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(msgs);
      setTimeout(() => scrollToBottom(), 100);
    });

    return () => unsubscribe();
  }, [user, activeContact]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !activeContact) return;

    const conversationId = [user.uid, activeContact.id].sort().join('_');
    const msgText = inputText;
    setInputText(""); // optimistic clear

    try {
      await addDoc(collection(db, "chats"), {
        conversationId,
        sender_id: user.uid,
        receiver_id: activeContact.id,
        text: msgText,
        created_at: serverTimestamp(),
        book_id: linkedBookId || null,
      });
      scrollToBottom();
    } catch (error) {
      console.error("Error sending message", error);
      toast.error("Failed to send message");
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold font-heading mb-4">Please log in to use chat</h2>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 h-[calc(100vh-4rem)]">
      <Card className="h-full flex overflow-hidden border shadow-sm">
        
        {/* Left Sidebar (Contacts) */}
        <div className="w-1/3 md:w-1/4 border-r bg-muted/20 flex flex-col h-full">
          <div className="p-4 border-b bg-muted/40">
            <h2 className="font-heading font-bold text-lg">Messages</h2>
          </div>
          <ScrollArea className="flex-1">
            {contacts.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No active conversations yet.
              </div>
            ) : (
              contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setActiveContact(contact)}
                  className={`w-full text-left p-4 border-b flex items-center gap-3 transition-colors ${activeContact?.id === contact.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                >
                  <div className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-semibold text-sm truncate">{contact.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {contact.lastMessage || "Tap to chat"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Right Area (Chat) */}
        <div className="flex-1 flex flex-col h-full bg-background relative">
          {activeContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center gap-3 shadow-sm z-10 bg-background">
                <div className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold">{activeContact.name}</h2>
                  {linkedBookId && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> Discussing a book
                    </p>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4 bg-muted/5">
                <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full pb-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                      Send a message to start the conversation!
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === user.uid;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div 
                            className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                              isMe 
                                ? 'bg-primary text-primary-foreground rounded-br-sm' 
                                : 'bg-muted text-foreground rounded-bl-sm border'
                            }`}
                          >
                            <p className="whitespace-pre-wrap text-sm sm:text-base">{msg.text}</p>
                            {msg.created_at && (
                              <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                {new Date(msg.created_at?.toDate ? msg.created_at.toDate() : Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t bg-background">
                <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-end gap-2">
                  <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
                    <ImageIcon className="w-5 h-5" />
                  </Button>
                  <Input 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-muted/50 border-0 focus-visible:ring-1"
                  />
                  <Button type="submit" size="icon" className="shrink-0 rounded-full w-10 h-10" disabled={!inputText.trim()}>
                    <Send className="w-4 h-4 ml-0.5" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
              <p>Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading chat...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}
