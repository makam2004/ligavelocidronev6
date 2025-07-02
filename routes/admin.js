// routes/admin.js (con trazado completo)
import express from 'express';
import basicAuth from 'express-basic-auth';
import supabase from '../supabaseClient.js';
import fetch from 'node-fetch';

const router = express.Router();

// Configuración de logs detallados
const debugLog = (message, data = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] DEBUG: ${message}`, JSON.stringify(data));
};

// Autenticación básica con logs
const auth = basicAuth({
  users: { 
    [process.env.ADMIN_USER]: process.env.ADMIN_PASS 
  },
  challenge: true,
  unauthorizedResponse: 'Acceso no autorizado'
});

// Middleware de trazado de solicitudes
router.use((req, res, next) => {
  debugLog('Solicitud recibida', {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers
  });
  next();
});

// Ruta para guardar tracks con trazado completo
router.post('/api/nuevo-track', auth, async (req, res) => {
  const trackData = req.body;
  debugLog('Intentando guardar track', trackData);

  try {
    // Validación completa
    if (!trackData.track_id || !trackData.nombre || !trackData.escenario) {
      debugLog('Validación fallida', { trackData });
      return res.status(400).json({ 
        error: 'Datos incompletos',
        required: ['track_id', 'nombre', 'escenario'],
        received: Object.keys(trackData)
      });
    }

    // Preparar datos para Supabase
    const trackToInsert = {
      track_id: trackData.track_id,
      nombre: trackData.nombre,
      escenario: trackData.escenario,
      sim_version: trackData.sim_version || '1.16',
      race_mode: trackData.race_mode || 6,
      es_oficial: trackData.es_oficial || false,
      fecha_creacion: new Date().toISOString()
    };

    debugLog('Insertando en Supabase', { trackToInsert });

    // Insertar en Supabase
    const { data, error, status } = await supabase
      .from('tracks')
      .insert([trackToInsert])
      .select();

    debugLog('Respuesta de Supabase', { data, error, status });

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No se recibieron datos de Supabase');
    }

    debugLog('Track guardado exitosamente', { trackId: data[0].id });

    // Notificación a Telegram (opcional)
    if (process.env.TELEGRAM_BOT_TOKEN1) {
      try {
        const telegramResponse = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN1}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID1,
            text: `🆕 Nuevo track añadido:\n\n🏁 ${trackData.nombre}\n🌍 ${trackData.escenario}`,
            parse_mode: 'HTML'
          })
        });
        debugLog('Notificación a Telegram enviada', await telegramResponse.json());
      } catch (tgError) {
        console.error('Error al notificar a Telegram:', tgError);
      }
    }

    res.json({ 
      success: true,
      track: data[0],
      debug: {
        supabase_status: status,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error completo:', error);
    debugLog('Error en la operación', {
      error: error.message,
      stack: error.stack,
      receivedData: trackData
    });

    res.status(500).json({ 
      error: 'Error al guardar track',
      detalle: error.message,
      debug: {
        supabase_url: process.env.SUPABASE_URL,
        tabla_existe: await checkTableExists('tracks'),
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Función para verificar si la tabla existe
async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
      
    return !error;
  } catch (e) {
    return false;
  }
}

// Ruta de diagnóstico
router.get('/api/admin/debug', auth, async (req, res) => {
  try {
    const tables = ['configuracion', 'tracks', 'jugadores'];
    const tableChecks = {};
    
    for (const table of tables) {
      tableChecks[table] = await checkTableExists(table);
    }

    res.json({
      status: 'Diagnóstico completo',
      variables: {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        ADMIN_USER: !!process.env.ADMIN_USER,
        VELOCIDRONE_API_TOKEN: !!process.env.VELOCIDRONE_API_TOKEN
      },
      tablas: tableChecks,
      ultimo_error: await getLastError()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Función para obtener el último error (simplificada)
async function getLastError() {
  try {
    const { data } = await supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
      
    return data[0] || 'No hay registros de errores';
  } catch (e) {
    return 'No se pudo acceder a los logs';
  }
}

export default router;