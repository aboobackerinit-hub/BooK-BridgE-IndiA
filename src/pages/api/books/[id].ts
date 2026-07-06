import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Book ID is required' });
      }

      // Get book details
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .single();

      if (bookError || !book) {
        return res.status(404).json({ error: 'Book not found' });
      }

      // Get seller details
      const { data: seller, error: sellerError } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, rating, reviews_count')
        .eq('id', book.seller_id)
        .single();

      // Get reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('book_id', id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Increment views
      await supabase
        .from('books')
        .update({ views_count: book.views_count + 1 })
        .eq('id', id);

      res.status(200).json({
        success: true,
        data: {
          book,
          seller,
          reviews,
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const updates = req.body;

      const { data, error } = await supabase
        .from('books')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      const { error } = await supabase
        .from('books')
        .update({ availability: 'unavailable', deleted_at: new Date() })
        .eq('id', id);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json({ success: true, message: 'Book deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
