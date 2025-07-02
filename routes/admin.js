// routes/admin.js
import express from 'express';
import basicAuth from 'express-basic-auth';
import supabase from '../supabaseClient.js';
import fetch from 'node-fetch';

const router = express.Router();

// Configuración de autenticación básica
const auth = basicAuth({
  users: { 
    [process.env.ADMIN_USER]: process.env.ADMIN_PASS 
  },
  challenge: true,
  unauthorizedResponse: 'Acceso no autorizado'
});

// 1. Ruta para verificar tracks con la API de Velocidrone
router.post('/api/verificar-track', auth, async (req, res) => {
  const { track_id, sim_version, race_mode } = req.body;
  
  try {
    const response = await fetch('https://velocidrone.co.uk/api/leaderboard', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VELOCIDRONE_API_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `post_data=${encodeURIComponent(
        `track_id=${track_id}&sim_version=${sim_version || '1.16'}` +
        `&offset=0&count=10&race_mode=${race_mode || 6}&protected_track_value=1`
      )}`
    });

    const data = await response.json();
    
    if (!data.tracktimes || data.tracktimes.length === 0) {
      return res.json({ 
        existe: false,
        message: 'Track encontrado pero sin tiempos. Completa nombre y escenario manualmente.' 
      });
    }

    res.json({
      existe: true,
      data: {
        track_id,
        sim_version,
        race_mode,
        ejemplo_tiempo: data.tracktimes[0].lap_time,
        ejemplo_jugador: data.tracktimes[0].playername
      }
    });
  } catch (error) {
    console.error('Error al verificar track:', error);
    res.status(500).json({ 
      error: 'Error al conectar con la API de Velocidrone',
      detalle: error.message 
    });
  }
});

// 2. Ruta para añadir nuevos tracks
router.post('/api/nuevo-track', auth, async (req, res) => {
  const { track_id, nombre, escenario, sim_version, race_mode, es_oficial } = req.body;

  try {
    const { data, error } = await supabase
      .from('tracks')
      .insert([{
        track_id,
        nombre,
        escenario,
        sim_version,
        race_mode,
        es_oficial,
        fecha_creacion: new Date().toISOString()
      }])
      .select();

    if (error) throw error;

    // Notificación a Telegram
    if (process.env.TELEGRAM_BOT_TOKEN1) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN1}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID1,
          text: `🆕 Nuevo track añadido:\n\n🏁 ${nombre}\n🌍 ${escenario}\n🆔 ID: ${track_id}\n🔧 Tipo: ${es_oficial ? 'Oficial' : 'No oficial'}`,
          parse_mode: 'HTML',
          message_thread_id: 4
        })
      });
    }

    res.json({ 
      success: true, 
      message: '✅ Track añadido correctamente',
      track: data[0] 
    });
  } catch (error) {
    console.error('Error al añadir track:', error);
    res.status(500).json({ 
      error: 'Error al guardar el track',
      detalle: error.message 
    });
  }
});

// 3. Ruta para listar todos los tracks
router.get('/api/tracks', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener tracks',
      detalle: error.message 
    });
  }
});

// 4. Ruta para eliminar tracks
router.delete('/api/tracks/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('tracks')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al eliminar track',
      detalle: error.message 
    });
  }
});

// 5. Ruta para actualizar configuración (existente)
router.post('/admin/update-tracks', auth, async (req, res) => {
  try {
    const { track1_escena, track1_pista, track2_escena, track2_pista } = req.body;
    
    const { error } = await supabase
      .from('configuracion')
      .upsert([{
        id: 1,
        track1_escena,
        track1_pista,
        track2_escena,
        track2_pista,
        updated_at: new Date().toISOString()
      }], { onConflict: ['id'] });

    if (error) throw error;
    res.json({ success: true, message: 'Configuración actualizada' });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al actualizar configuración',
      detalle: error.message 
    });
  }
});

export default router;