import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '@/lib/api';

const DynamicLegalPage = ({ slug, FallbackComponent }) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/legal/${slug}`)
      .then(res => {
        if (res.data.content && res.data.content !== "Content not found or being updated.") {
          setContent(res.data.content);
        } else {
          setContent(null); // Use fallback
        }
      })
      .catch(err => {
        console.error("Failed to fetch legal page:", err);
        setContent(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  if (loading) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-2 bg-slate-200 rounded"></div><div className="space-y-3"><div className="grid grid-cols-3 gap-4"><div className="h-2 bg-slate-200 rounded col-span-2"></div><div className="h-2 bg-slate-200 rounded col-span-1"></div></div><div className="h-2 bg-slate-200 rounded"></div></div></div></div>;

  if (content) {
    return <div dangerouslySetInnerHTML={{ __html: content }} />;
  }

  // If no DB content exists, use the hardcoded React component as fallback
  return <FallbackComponent />;
};

export default DynamicLegalPage;
