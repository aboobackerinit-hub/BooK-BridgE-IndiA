import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Image as ImageIcon, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

const fmtTime = (iso) => {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); }
  catch { return ""; }
};

const PostCard = ({ post, currentUser, onUpdate }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const liked = post.likes?.includes(currentUser.id);

  const toggleLike = async () => {
    await api.post(`/posts/${post.id}/like`);
    onUpdate();
  };
  const addComment = async () => {
    if (!commentText.trim()) return;
    await api.post(`/posts/${post.id}/comment`, { text: commentText });
    setCommentText("");
    onUpdate();
  };

  return (
    <Card className="p-6 space-y-4 fade-up" data-testid={`post-${post.id}`}>
      <div className="flex items-center gap-3">
        <Link to={`/profile/${post.author?.id}`}>
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">{post.author?.name?.[0]}</AvatarFallback>
          </Avatar>
        </Link>
        <div>
          <Link to={`/profile/${post.author?.id}`} className="font-serif font-semibold hover:text-primary transition-colors">
            {post.author?.name}
          </Link>
          <div className="text-xs text-muted-foreground flex gap-2 items-center">
            <span className="font-mono">{post.author?.bbid}</span>
            <span>·</span>
            <span>{fmtTime(post.created_at)}</span>
          </div>
        </div>
      </div>
      <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{post.text}</p>
      {post.image_url && (
        <div className="rounded-xl overflow-hidden border border-border">
          <img src={post.image_url} alt="" className="w-full max-h-[500px] object-cover" />
        </div>
      )}
      <div className="flex items-center gap-1 pt-2 border-t border-border">
        <Button variant="ghost" size="sm" onClick={toggleLike} className={`rounded-full ${liked ? "text-primary" : ""}`} data-testid={`like-btn-${post.id}`}>
          <Heart className={`w-4 h-4 mr-1 ${liked ? "fill-primary" : ""}`} /> {post.likes?.length || 0}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowComments((s) => !s)} className="rounded-full" data-testid={`comment-btn-${post.id}`}>
          <MessageCircle className="w-4 h-4 mr-1" /> {post.comments?.length || 0}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }} className="rounded-full" data-testid={`share-btn-${post.id}`}>
          <Share2 className="w-4 h-4 mr-1" /> Share
        </Button>
      </div>
      {showComments && (
        <div className="space-y-3 pt-2">
          {post.comments?.map((c) => (
            <div key={c.id} className="flex gap-2">
              <Avatar className="w-8 h-8"><AvatarFallback className="text-xs bg-muted">{c.user_name?.[0]}</AvatarFallback></Avatar>
              <div className="bg-muted/60 rounded-2xl px-3 py-2 flex-1">
                <div className="text-xs font-semibold">{c.user_name}</div>
                <div className="text-sm">{c.text}</div>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder="Write a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addComment()} className="rounded-full" data-testid={`comment-input-${post.id}`} />
            <Button size="icon" onClick={addComment} className="rounded-full shrink-0" data-testid={`send-comment-${post.id}`}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

const ReviewsPage = () => {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const { user } = useAuth();

  const load = async () => {
    const { data } = await api.get("/posts");
    setPosts(data);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!text.trim()) return toast.error("Write something");
    try {
      await api.post("/posts", { text, image_url: imageUrl });
      setText(""); setImageUrl("");
      toast.success("Posted!");
      load();
    } catch (e) { toast.error("Failed"); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Timeline</div>
        <h1 className="font-serif text-4xl mb-1">Community</h1>
        <p className="text-muted-foreground">Write from your reading. Share, like, and discuss.</p>
      </div>

      <Card className="p-5 space-y-3">
        <div className="flex gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">{user?.name?.[0]}</AvatarFallback>
          </Avatar>
          <Textarea
            placeholder={`What are you reading, ${user?.name?.split(" ")[0]}?`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 resize-none min-h-[80px] border-0 focus-visible:ring-0 shadow-none p-0"
            data-testid="new-post-textarea"
          />
        </div>
        {imageUrl && (
          <div className="rounded-xl overflow-hidden border border-border relative">
            <img src={imageUrl} alt="" className="w-full max-h-64 object-cover" />
            <Button size="sm" variant="secondary" onClick={() => setImageUrl("")} className="absolute top-2 right-2 rounded-full">Remove</Button>
          </div>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input placeholder="Paste image URL (optional)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 h-8 px-1" data-testid="new-post-image-url" />
          </div>
          <Button onClick={submit} className="rounded-full px-6" data-testid="new-post-submit-btn">Post</Button>
        </div>
      </Card>

      {posts.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">No posts yet. Be the first to share!</Card>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => <PostCard key={p.id} post={p} currentUser={user} onUpdate={load} />)}
        </div>
      )}
    </div>
  );
};

export default ReviewsPage;
