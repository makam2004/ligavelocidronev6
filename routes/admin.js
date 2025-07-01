// routes/admin.js
import express from 'express';
import basicAuth from 'express-basic-auth';
import supabase from '../supabaseClient.js';
import fetch from 'node-fetch';

const router = express.Router();

// Autenticación básica
const auth = basicAuth({
  users: { [process.env.ADMIN_USER]: process.env.ADMIN_PASS },
  challenge: true
});

// Nueva ruta para obtener datos de la API de Velocidrone
router.post('/api/verificar-track', auth, async (req, res) => {
  const { track_id, sim_version, race_mode } = req.body;
  
  try {
    const apiToken = process.env.VELOCIDRONE_API_TOKEN;
    const url = 'https://velocidrone.co.uk/api/leaderboard';
    
    const postData = new URLSearchParams({
      track_id,
      sim_version: sim_version || '1.16',
      offset: 0,
      count: 10,
      race_mode: race_mode || 6,
      protected_track_value: 1
    }).toString();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `post_data=${encodeURIComponent(postData)}`
    });

    const data = await response.json();
    
    if (!data.tracktimes || data.tracktimes.length === 0) {
      return res.json({ 
        existe: false,
        message: 'Track encontrado pero sin tiempos registrados. Puedes añadirlo manualmente.' 
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
    res.status(500).json({ error: 'Error al conectar con la API de Velocidrone' });
  }
});

// Ruta para añadir nuevo track
router.post('/api/nuevo-track', auth, async (req, res) => {
  const { track_id, nombre, escenario, sim_version, race_mode, es_oficial } = req.body;

  try {
    const { error } = await supabase
      .from('tracks')
      .insert([{
        track_id,
        nombre,
        escenario,
        sim_version,
        race_mode,
        es_oficial,
        fecha_creacion: new Date().toISOString()
      }]);

    if (error) throw error;

    // Enviar notificación a Telegram
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN1}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID1,
        text: `🆕 Nuevo track añadido:\n\n` +
              `🏁 ${nombre}\n` +
              `🌍 ${escenario}\n` +
              `🆔 ID: ${track_id}\n` +
              `🔧 Tipo: ${es_oficial ? 'Oficial' : 'No oficial'}`,
        parse_mode: 'HTML',
        message_thread_id: 4
      })
    });

    res.json({ success: true, message: 'Track añadido correctamente' });
  } catch (error) {
    console.error('Error al añadir track:', error);
    res.status(500).json({ error: 'Error al guardar el track' });
  }
});

// Resto de tus rutas existentes...
export default router;