// routes/tracks.js
import express from 'express';
import supabase from '../supabaseClient.js';

const router = express.Router();

// Obtener todos los tracks
router.get('/api/tracks', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar track
router.delete('/api/tracks/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('tracks')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;