// routes/tiemposMejorados.js
import express from 'express';
import supabase from '../supabaseClient.js';
import { fetchTrackFromAPI } from '../services/velocidroneService.js';
import puppeteer from 'puppeteer';

const router = express.Router();

// Función para obtener tracks desde Supabase
async function obtenerTracksActivos() {
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .order('fecha_creacion', { ascending: false });
  return data || [];
}

// Función existente de scraping (para tracks oficiales)
async function obtenerResultados(url, nombresJugadores, textoPestania) {
  // ... (mantén tu código actual de scraping aquí)
}

// Nueva función para procesar datos de la API
function procesarDatosAPI(data) {
  if (!data.tracktimes) return [];
  return data.tracktimes.map(t => ({
    jugador: t.playername,
    tiempo: convertirTiempoAMilisegundos(t.lap_time),
    model_name: t.model_name,
    country: t.country
  }));
}

// Helper para convertir "00:01:23.456" a milisegundos
function convertirTiempoAMilisegundos(tiempoStr) {
  const [hh, mm, ssms] = tiempoStr.split(':');
  const [ss, ms] = ssms.split('.');
  return ((hh * 3600) + (mm * 60) + parseFloat(ss)) * 1000 + parseInt(ms);
}

// Ruta principal modificada
router.get('/api/tiempos-mejorados', async (_req, res) => {
  try {
    const semana = calcularSemanaActual();
    const tracks = await obtenerTracksActivos();
    const { data: jugadores } = await supabase.from('jugadores').select('nombre');
    const nombresJugadores = jugadores.map(j => j.nombre);

    const resultados = [];
    for (const track of tracks) {
      let datos;
      if (track.es_oficial) {
        // Scraping para tracks oficiales
        datos = await obtenerResultados(
          `https://www.velocidrone.com/leaderboard/${track.escenario}/${track.nombre}/All`,
          nombresJugadores,
          track.race_mode === 6 ? "3 Lap: Single Class" : "Race Mode: Single Class"
        );
      } else {
        // API para tracks no oficiales
        const apiData = await fetchTrackFromAPI(track.track_id, track.sim_version, track.race_mode);
        datos = {
          pista: track.nombre,
          escenario: track.escenario,
          resultados: procesarDatosAPI(apiData)
        };
      }
      resultados.push(datos);
    }

    res.json(resultados);
  } catch (error) {
    console.error('Error en tiempos-mejorados:', error);
    res.status(500).json({ error: 'Error al obtener resultados' });
  }
});

// ... (mantén tus otras funciones existentes como calcularSemanaActual, etc.)

export default router;