import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, UserPlus, UserCheck, BookOpen, Ban } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const ProfilePage = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [books, setBooks] = useState([]);
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await api.get(`/users/${userId}`);
    setProfile(data);
    const bres = await api.get("/books", { params: { owner_id: userId } });
    setBooks(bres.data);
  };
  useEffect(() => { load(); }, [userId]);

  const following = user?.following?.includes(userId);
  const blocked = user?.blocked?.includes(userId);
  const toggleFollow = async () => {
    await api.post(`/users/${userId}/follow`);
    await refresh();
    load();
  };
  const toggleBlock = async () => {
    const { data } = await api.post(`/users/${userId}/block`);
    await refresh();
    toast.success(data.blocked ? "User blocked" : "User unblocked");
  };

  if (!profile) return <div className="text-center py-20 text-muted-foreground">Loading...</div>;
  const isMe = user?.id === profile.id;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="p-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
            <AvatarFallback className="bg-primary/10 text-primary text-4xl font-serif">{profile.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="font-serif text-3xl">{profile.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-sm text-muted-foreground">{profile.bbid}</span>
                  <Badge variant="outline" className="capitalize">{profile.role?.replace("_", " ")}</Badge>
                </div>
              </div>
              {!isMe && (
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={toggleFollow} variant={following ? "outline" : "default"} className="rounded-full" data-testid="follow-btn">
                    {following ? (<><UserCheck className="w-4 h-4 mr-1" /> Following</>) : (<><UserPlus className="w-4 h-4 mr-1" /> Follow</>)}
                  </Button>
                  <Button onClick={() => navigate(`/chat/${profile.id}`)} className="rounded-full" data-testid="message-btn">
                    <MessageCircle className="w-4 h-4 mr-1" /> Message
                  </Button>
                  <Button onClick={toggleBlock} variant="ghost" size="sm" className="rounded-full text-destructive hover:bg-destructive/10" data-testid="block-btn">
                    <Ban className="w-4 h-4 mr-1" /> {blocked ? "Unblock" : "Block"}
                  </Button>
                </div>
              )}
            </div>
            {profile.bio && <p className="mt-4 text-foreground/80">{profile.bio}</p>}
            <div className="mt-4 flex gap-6 text-sm">
              <div><span className="font-semibold">{profile.followers?.length || 0}</span> <span className="text-muted-foreground">followers</span></div>
              <div><span className="font-semibold">{profile.following?.length || 0}</span> <span className="text-muted-foreground">following</span></div>
              <div><span className="font-semibold">{books.length}</span> <span className="text-muted-foreground">books listed</span></div>
            </div>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="font-serif text-2xl mb-4">Books by {profile.name?.split(" ")[0]}</h2>
        {books.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No books listed.</Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {books.map((b) => (
              <Link to={`/book/${b.id}`} key={b.id} className="rounded-2xl border border-border bg-card hover-lift overflow-hidden block">
                <div className="aspect-[3/4] bg-muted overflow-hidden">
                  {b.image_url ? <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                    : <div className="spine w-full h-full flex items-center justify-center"><BookOpen className="w-8 h-8 text-white/70" /></div>}
                </div>
                <div className="p-3">
                  <div className="font-serif text-sm font-semibold line-clamp-2">{b.title}</div>
                  <div className="font-mono text-primary text-sm mt-1">₹{b.price}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
