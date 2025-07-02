// routes/admin.js
import express from 'express';
import basicAuth from 'express-basic-auth';
import supabase from '../supabaseClient.js';
import fetch from 'node-fetch';

const router = express.Router();

// Configuración de autenticación
const auth = basicAuth({
  users: { 
    [process.env.ADMIN_USER]: process.env.ADMIN_PASS 
  },
  challenge: true,
  unauthorizedResponse: 'Acceso no autorizado'
});

// Middleware para verificar conexión a Supabase
router.use(auth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('configuracion')
      .select('*')
      .limit(1);
      
    if (error) throw new Error('Error conectando a Supabase');
    next();
  } catch (error) {
    res.status(500).json({ 
      error: 'Error de conexión a la base de datos',
      detalle: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Ruta para verificar tracks con API de Velocidrone
router.post('/api/verificar-track', auth, async (req, res) => {
  const { track_id, sim_version, race_mode } = req.body;

  if (!track_id) {
    return res.status(400).json({ error: 'ID de track requerido' });
  }

  try {
    const response = await fetch('https://velocidrone.co.uk/api/leaderboard', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VELOCIDRONE_API_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        track_id,
        sim_version: sim_version || '1.16',
        offset: 0,
        count: 10,
        race_mode: race_mode || 6,
        protected_track_value: 1
      })
    });

    const data = await response.json();
    
    if (!data.tracktimes || data.tracktimes.length === 0) {
      return res.json({ 
        existe: false,
        message: 'Track encontrado pero sin tiempos registrados' 
      });
    }

    res.json({
      existe: true,
      data: {
        ejemplo_tiempo: data.tracktimes[0].lap_time,
        ejemplo_jugador: data.tracktimes[0].playername
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al conectar con API de Velocidrone',
      detalle: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Ruta para añadir nuevos tracks
router.post('/api/nuevo-track', auth, async (req, res) => {
  const { track_id, nombre, escenario, sim_version, race_mode, es_oficial } = req.body;

  if (!track_id || !nombre || !escenario) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  try {
    const { data, error } = await supabase
      .from('tracks')
      .insert([{
        track_id,
        nombre,
        escenario,
        sim_version: sim_version || '1.16',
        race_mode: race_mode || 6,
        es_oficial: es_oficial || false
      }])
      .select();

    if (error) throw error;

    // Notificación a Telegram si está configurado
    if (process.env.TELEGRAM_BOT_TOKEN1) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN1}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID1,
          text: `🆕 Nuevo track añadido:\n\n🏁 ${nombre}\n🌍 ${escenario}\n🆔 ID: ${track_id}`,
          parse_mode: 'HTML'
        })
      });
    }

    res.json({ 
      success: true, 
      track: data[0] 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al guardar track',
      detalle: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Ruta para actualizar configuración principal
router.post('/admin/update-tracks', auth, async (req, res) => {
  const { track1_escena, track1_pista, track2_escena, track2_pista } = req.body;

  try {
    // 1. Actualizar configuración
    const { error: configError } = await supabase
      .from('configuracion')
      .upsert([{
        id: 1,
        track1_escena,
        track1_pista,
        track2_escena,
        track2_pista,
        updated_at: new Date().toISOString()
      }], { onConflict: ['id'] });

    if (configError) throw configError;

    // 2. Actualizar ranking anual
    const { error: rpcError } = await supabase.rpc('incrementar_ranking_anual');
    if (rpcError) throw rpcError;

    res.json({ 
      success: true,
      message: 'Configuración y ranking actualizados'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error en la actualización',
      detalle: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Ruta para listar tracks
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
      detalle: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Ruta para eliminar tracks
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
      detalle: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

export default router;