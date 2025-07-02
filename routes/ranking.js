// routes/ranking.js
import express from 'express';
import supabase from '../supabaseClient.js';

const router = express.Router();

router.get('/api/enviar-ranking-anual', async (_req, res) => {
  try {
    // 1. Obtener jugadores con puntos anuales
    const { data: jugadores, error } = await supabase
      .from('jugadores')
      .select('nombre, puntos_anuales')
      .not('puntos_anuales', 'is', null) // 👈 Filtra nulos
      .order('puntos_anuales', { ascending: false });

    if (error) throw error;
    if (!jugadores || jugadores.length === 0) { // 👈 Maneja caso vacío
      return res.json([]);
    }

    // 2. Formatear respuesta
    const resultado = jugadores.map(j => ({
      nombre: j.nombre || 'Desconocido',
      puntos: j.puntos_anuales || 0
    }));

    res.json(resultado);
  } catch (err) {
    console.error('Error al obtener ranking anual:', err);
    res.status(500).json([]); // 👈 Devuelve array vacío en caso de error
  }
});

export default router;