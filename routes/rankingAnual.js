// routes/rankingAnual.js
import express from 'express';
import supabase from '../supabaseClient.js';

const router = express.Router();

router.get('/api/enviar-ranking-anual', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('jugadores')
      .select('id, nombre, puntos_anuales')
      .not('puntos_anuales', 'is', null) // Filtra jugadores sin puntos
      .order('puntos_anuales', { ascending: false });

    if (error) throw error;

    // Formatear respuesta
    const resultado = data.map(jugador => ({
      nombre: jugador.nombre || 'Desconocido',
      puntos_anuales: jugador.puntos_anuales || 0 // Asegura valor numérico
    }));

    res.json(resultado);
  } catch (err) {
    console.error('Error al obtener ranking anual:', err);
    res.status(500).json([]); // Devuelve array vacío en caso de error
  }
});

export default router;