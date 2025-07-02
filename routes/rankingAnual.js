import express from 'express';
import supabase from '../supabaseClient.js';

const router = express.Router();

router.get('/api/enviar-ranking-anual', async (_req, res) => {
  try {
    // 1. Consulta con select explícito y conversión de tipos
    const { data, error } = await supabase
      .from('jugadores')
      .select('nombre, puntos_anuales')
      .not('puntos_anuales', 'is', null)
      .order('puntos_anuales', { ascending: false });

    if (error) {
      console.error('Error Supabase:', error);
      throw new Error(error.message);
    }

    // 2. Validación de datos y formateo seguro
    const ranking = data.map(j => ({
      nombre: j.nombre || 'Jugador sin nombre',
      puntos: Number(j.puntos_anuales) || 0 // Conversión explícita a número
    }));

    // 3. Log de diagnóstico (solo en desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      console.log('Datos crudos de Supabase:', data);
      console.log('Ranking formateado:', ranking);
    }

    res.json(ranking);

  } catch (err) {
    console.error('Error completo:', err);
    res.status(500).json({
      error: 'Error al obtener el ranking',
      detalle: process.env.NODE_ENV !== 'production' ? err.message : undefined
    });
  }
});

export default router;