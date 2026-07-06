import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

// API Routes Example
// POST /api/books - Create book listing

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const {
        title,
        author,
        publisher,
        isbn,
        category,
        condition,
        price,
        description,
        seller_id,
        image_urls,
        location,
      } = req.body;

      // Validation
      if (!title || !author || !category || !price || !seller_id) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Insert book into database
      const { data, error } = await supabase.from('books').insert({
        title,
        author,
        publisher,
        isbn,
        category,
        condition,
        price,
        description,
        seller_id,
        image_urls,
        location,
        availability: 'in-stock',
      });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(201).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'GET') {
    try {
      const { category, search, limit = 20, offset = 0 } = req.query;

      let query = supabase
        .from('books')
        .select('*')
        .eq('availability', 'in-stock')
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      if (search) {
        query = query.or(
          `title.ilike.%${search}%,author.ilike.%${search}%`
        );
      }

      query = query.range(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string) - 1
      );

      const { data, error } = await query;

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
