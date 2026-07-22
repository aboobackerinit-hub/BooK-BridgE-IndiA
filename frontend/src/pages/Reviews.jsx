import React, { useEffect, useState, useRef, useCallback } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Heart, MessageCircle, Share2, ImagePlus, Send, X, Loader2, 
  MoreHorizontal, Edit2, Trash2, Flag, Pin, Bookmark, 
  CheckCircle, ShoppingBag, Eye, Store
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

const fmtTime = (iso) => {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); }
  catch { return ""; }
};

const TruncatedText = ({ text, maxLength = 250 }) => {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  if (text.length <= maxLength) return <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{text}</p>;
  
  return (
    <div>
      <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
        {expanded ? text : `${text.slice(0, maxLength)}...`}
      </p>
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="text-primary font-medium hover:underline mt-1 text-sm"
      >
        {expanded ? "See Less" : "See More"}
      </button>
    </div>
  );
};

const BookReferenceCard = ({ bookId }) => {
  const [book, setBook] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (bookId) {
      api.get(`/books/${bookId}`).then(r => setBook(r.data)).catch(console.error);
    }
  }, [bookId]);

  if (!book) return null;

  return (
    <div className="mt-3 border rounded-xl overflow-hidden bg-muted/20 flex flex-col sm:flex-row">
      <div className="w-full sm:w-1/3 aspect-[3/4] sm:aspect-square bg-muted relative">
        <OptimizedImage src={book.image_url} alt={book.title} className="w-full h-full object-cover absolute inset-0" />
      </div>
      <div className="p-4 flex flex-col justify-center flex-1 space-y-2">
        <h4 className="font-serif text-lg font-bold line-clamp-1">{book.title}</h4>
        <p className="text-muted-foreground text-sm line-clamp-1">by {book.author}</p>
        <div className="flex items-center gap-2 mt-2">
          <Button size="sm" variant="secondary" className="flex-1 rounded-full h-8" onClick={() => navigate(`/book/${book.id}`)}>
            <Eye className="w-3 h-3 mr-1" /> View
          </Button>
          <Button size="sm" className="flex-1 rounded-full h-8" onClick={() => navigate(`/book/${book.id}`)}>
            <ShoppingBag className="w-3 h-3 mr-1" /> Buy
          </Button>
          <Button size="sm" variant="outline" className="flex-1 rounded-full h-8" onClick={() => navigate(`/store/${book.owner_id}`)}>
            <Store className="w-3 h-3 mr-1" /> Seller
          </Button>
        </div>
      </div>
    </div>
  );
};

const PostCard = ({ post, currentUser, onUpdate, onDelete }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [isSaved, setIsSaved] = useState(false); // Mock saved state
  const navigate = useNavigate();

  const liked = post.likes?.includes(currentUser.id);
  const isOwner = post.user_id === currentUser.id;
  const canPin = ["admin", "publisher", "store_owner"].includes(currentUser.role);

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

  const handleEdit = async () => {
    try {
      await api.put(`/posts/${post.id}`, { text: editText });
      setIsEditing(false);
      toast.success("Post updated");
      onUpdate();
    } catch (e) {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await api.delete(`/posts/${post.id}`);
      toast.success("Post deleted");
      onDelete(post.id);
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const handleReport = async () => {
    try {
      await api.post(`/posts/${post.id}/report`, { reason: "Inappropriate content" });
      toast.success("Post reported");
    } catch (e) {
      toast.error("Failed to report");
    }
  };

  const handlePin = async () => {
    try {
      await api.put(`/posts/${post.id}/pin`);
      toast.success(post.pinned ? "Post unpinned" : "Post pinned");
      onUpdate();
    } catch (e) {
      toast.error("Failed to pin");
    }
  };

  return (
    <Card className={`p-4 sm:p-6 space-y-4 shadow-sm border-border/50 rounded-2xl ${post.pinned ? "border-primary/50 bg-primary/5" : ""}`} data-testid={`post-${post.id}`}>
      {post.pinned && (
        <div className="flex items-center text-xs font-semibold text-primary mb-2">
          <Pin className="w-3 h-3 mr-1" /> Pinned Post
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${post.author?.id}`}>
            <Avatar className="w-12 h-12 border cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarImage src={post.author?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">{post.author?.name?.[0]}</AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <div className="flex items-center gap-1">
              <Link to={`/profile/${post.author?.id}`} className="font-serif font-bold text-base hover:underline transition-all">
                {post.author?.name}
              </Link>
              {["admin", "publisher", "store_owner"].includes(post.author?.role) && (
                <CheckCircle className="w-4 h-4 text-blue-500" />
              )}
            </div>
            <div className="text-[13px] text-muted-foreground flex gap-1.5 items-center">
              <span className="font-medium bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider">
                {post.author?.role === 'user' ? 'Member' : post.author?.role}
              </span>
              <span>·</span>
              <span>{fmtTime(post.created_at)}</span>
            </div>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-muted-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {isOwner ? (
              <>
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={handleReport}>
                <Flag className="w-4 h-4 mr-2" /> Report
              </DropdownMenuItem>
            )}
            {canPin && (
              <DropdownMenuItem onClick={handlePin}>
                <Pin className="w-4 h-4 mr-2" /> {post.pinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Textarea 
            value={editText} 
            onChange={e => setEditText(e.target.value)} 
            className="min-h-[100px] resize-none"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={handleEdit}>Save</Button>
          </div>
        </div>
      ) : (
        <TruncatedText text={post.text} />
      )}

      {post.image_url && (
        <div className="rounded-2xl overflow-hidden border border-border/50 bg-muted/10">
          <OptimizedImage src={post.image_url} alt="Post image" className="w-full max-h-[600px] object-cover" />
        </div>
      )}

      {post.book_id && <BookReferenceCard bookId={post.book_id} />}

      <div className="flex items-center justify-between pt-3 border-t border-border/50 text-muted-foreground px-1">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleLike} 
          className={`rounded-full hover:text-red-500 hover:bg-red-50 transition-colors ${liked ? "text-red-500" : ""}`}
        >
          <Heart className={`w-5 h-5 mr-1.5 ${liked ? "fill-red-500" : ""}`} /> 
          <span className="font-medium">{post.likes?.length || 0}</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowComments((s) => !s)} 
          className="rounded-full hover:text-blue-500 hover:bg-blue-50 transition-colors"
        >
          <MessageCircle className="w-5 h-5 mr-1.5" /> 
          <span className="font-medium">{post.comments?.length || 0}</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }} 
          className="rounded-full hover:text-green-500 hover:bg-green-50 transition-colors"
        >
          <Share2 className="w-5 h-5 mr-1.5" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsSaved(!isSaved)} 
          className={`rounded-full hover:text-yellow-600 hover:bg-yellow-50 transition-colors ${isSaved ? "text-yellow-600" : ""}`}
        >
          <Bookmark className={`w-5 h-5 mr-1.5 ${isSaved ? "fill-yellow-600" : ""}`} />
        </Button>
      </div>

      {showComments && (
        <div className="space-y-4 pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
          {post.comments?.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar className="w-8 h-8 mt-0.5 border">
                <AvatarFallback className="text-xs bg-muted font-medium">{c.user_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-muted/50 rounded-2xl px-4 py-2.5 inline-block max-w-[90%]">
                  <div className="text-sm font-semibold">{c.user_name}</div>
                  <div className="text-[15px] leading-snug break-words">{c.text}</div>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 ml-2">
                  {fmtTime(c.created_at)}
                </div>
              </div>
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">{currentUser?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 relative flex items-center bg-muted/30 rounded-3xl border focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all pr-1">
              <Textarea 
                placeholder="Write a comment..." 
                value={commentText} 
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    addComment();
                  }
                }}
                className="min-h-[40px] max-h-[120px] resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent py-2.5 px-4" 
              />
              <Button 
                size="icon" 
                onClick={addComment} 
                disabled={!commentText.trim()}
                className="rounded-full h-8 w-8 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

const Composer = ({ user, onPosted }) => {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
    if (file.size > 6 * 1024 * 1024) { toast.error("Image too large (max 6 MB)"); return; }
    
    setUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      // Simple optimization logic on frontend before upload
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = dataUrl; });
      const scale = Math.min(1, 1200 / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      setImageUrl(canvas.toDataURL("image/jpeg", 0.85));
    } catch (err) {
      toast.error("Failed to load image");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const submit = async () => {
    if (!text.trim() && !imageUrl) return toast.error("Post cannot be empty");
    try {
      setUploading(true);
      await api.post("/posts", { text, image_url: imageUrl });
      setText(""); 
      setImageUrl("");
      toast.success("Posted successfully!");
      onPosted();
    } catch (e) {
      toast.error("Failed to post");
    } finally {
      setUploading(false);
    }
  };

  const charCount = text.length;

  return (
    <Card className="p-5 space-y-4 shadow-sm border-border/50 rounded-2xl mb-6">
      <div className="flex gap-4">
        <Avatar className="w-10 h-10 border">
          <AvatarImage src={user?.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">{user?.name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-3">
          <Textarea
            placeholder={`What's on your mind, ${user?.name?.split(" ")[0]}?`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 resize-none min-h-[80px] border-none focus-visible:ring-0 shadow-none p-0 text-lg placeholder:text-muted-foreground/60 bg-transparent"
          />
          {imageUrl && (
            <div className="rounded-xl overflow-hidden border border-border/50 relative bg-muted/10 inline-block w-full">
              <OptimizedImage src={imageUrl} alt="Preview" className="max-h-[300px] w-auto mx-auto object-contain" />
              <Button 
                size="icon" 
                variant="destructive" 
                onClick={() => setImageUrl("")}
                className="absolute top-2 right-2 rounded-full h-8 w-8 shadow-md"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-full text-muted-foreground hover:text-green-600 hover:bg-green-50"
          >
            {uploading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ImagePlus className="w-5 h-5 mr-2 text-green-500" />}
            {uploading ? "Processing..." : "Photo"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
          {charCount > 0 && (
            <span className={`text-xs ${charCount > 2000 ? "text-destructive" : "text-muted-foreground"}`}>
              {charCount}
            </span>
          )}
        </div>
        <Button 
          onClick={submit} 
          disabled={uploading || (!text.trim() && !imageUrl)} 
          className="rounded-full px-8 font-semibold shadow-sm"
        >
          Post
        </Button>
      </div>
    </Card>
  );
};

const ReviewsPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();
  
  const observerTarget = useRef(null);

  const loadInitial = async () => {
    try {
      const { data } = await api.get("/posts?limit=10");
      setPosts(data);
      if (data.length < 10) setHasMore(false);
    } catch (e) {
      toast.error("Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || posts.length === 0) return;
    setLoadingMore(true);
    try {
      const lastId = posts[posts.length - 1].id;
      const { data } = await api.get(`/posts?limit=10&start_after=${lastId}`);
      if (data.length > 0) {
        setPosts(prev => [...prev, ...data]);
      }
      if (data.length < 10) setHasMore(false);
    } catch (e) {
      console.error("Load more failed", e);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, posts]);

  useEffect(() => {
    loadInitial();
  }, []);

  // Infinite Scroll Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    
    const target = observerTarget.current;
    if (target) {
      observer.observe(target);
    }
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [loadMore, hasMore, loadingMore]);

  // Handle post deletion locally to avoid full reload
  const handleDeletePost = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  // Sort: pinned first, then chronological
  const sortedPosts = [...posts].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0; // The initial fetch handles chronological ordering for the rest
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="mb-8">
        <h1 className="font-serif text-4xl mb-2 font-bold tracking-tight">Community Feed</h1>
        <p className="text-muted-foreground text-lg">Discuss books, share reviews, and connect with readers.</p>
      </div>

      <Composer user={user} onPosted={loadInitial} />

      {loading ? (
        <div className="space-y-6 animate-pulse">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-64 rounded-2xl bg-muted/20 border-border/50" />
          ))}
        </div>
      ) : sortedPosts.length === 0 ? (
        <Card className="p-16 text-center text-muted-foreground rounded-2xl border-dashed">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">No posts yet</p>
          <p className="text-sm">Be the first to share your thoughts!</p>
        </Card>
      ) : (
        <div className="space-y-5">
          {sortedPosts.map((p) => (
            <PostCard 
              key={p.id} 
              post={p} 
              currentUser={user} 
              onUpdate={() => {
                // Background update for a single post to refresh likes/comments/pins
                api.get('/posts?limit=50').then(res => {
                  const updated = res.data.find(post => post.id === p.id);
                  if (updated) {
                    setPosts(prev => prev.map(item => item.id === p.id ? updated : item));
                  }
                });
              }}
              onDelete={handleDeletePost}
            />
          ))}
          
          <div ref={observerTarget} className="py-6 flex justify-center">
            {loadingMore && <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
            {!hasMore && posts.length > 0 && (
              <p className="text-muted-foreground text-sm font-medium">You've reached the end!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsPage;
