// index.js (en la raíz del proyecto)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import supabase from './supabaseClient.js';
import cors from 'cors'; // 👈 Importación añadida
import tiemposMejorados from './routes/tiemposMejorados.js';
import adminRoutes from './routes/admin.js';
import rankingRoutes from './routes/ranking.js';
import commitRankingRoutes from './routes/commit_ranking.js';
import telegramRoutes from './routes/telegram.js';
import checkMejoras from "./routes/checkMejoras.js";
import './services/bot.js';
import rankingAnualRouter from './routes/rankingAnual.js';
import configuracionRouter from './routes/configuracion.js';
import tracksRouter from './routes/tracks.js';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración CORS para permitir tu dominio de pruebas
app.use(cors({
  origin: [
    'https://ligavelocidrone.onrender.com',
    'https://ligavelocidroneprev5.onrender.com', // 👈 Dominio de pruebas
    'http://localhost:3000' // Para desarrollo local
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ✅ Alta de jugador con verificación hCaptcha
app.post('/api/alta-jugador', async (req, res) => {
  const { nombre, token } = req.body;

  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    return res.status(400).json({ error: 'Nombre inválido.' });
  }

  if (!token) {
    return res.status(400).json({ error: 'Captcha obligatorio.' });
  }

  try {
    const captchaResponse = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.HCAPTCHA_SECRET,
        response: token
      })
    });

    const captcha = await captchaResponse.json();
    if (!captcha.success) {
      return res.status(403).json({ error: 'Captcha inválido.' });
    }
  } catch (err) {
    console.error('Error verificando hCaptcha:', err);
    return res.status(500).json({ error: 'Error al verificar el captcha.' });
  }

  try {
    const { data: existe } = await supabase
      .from('jugadores')
      .select('id')
      .eq('nombre', nombre.trim())
      .maybeSingle();

    if (existe) {
      return res.status(400).json({ error: 'El jugador ya existe.' });
    }

    const { error } = await supabase
      .from('jugadores')
      .insert([{ nombre: nombre.trim() }]);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error al registrar jugador:', err);
    res.status(500).json({ error: 'Error inesperado en el servidor.' });
  }
});

// ✅ Configuración de rutas
app.use(tiemposMejorados);
app.use(adminRoutes); 
app.use(rankingRoutes);
app.use(commitRankingRoutes);
app.use(telegramRoutes);
app.use(checkMejoras);
app.use(rankingAnualRouter);
app.use(configuracionRouter);
app.use(tracksRouter);

// ✅ Endpoint para exponer credenciales Supabase al frontend (anon)
app.get("/api/supabase-credentials", (req, res) => {
  res.json({
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY
  });
});

// ✅ Middleware para manejar errores
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    detalle: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ✅ Iniciar servidor
app.listen(PORT, () => {
  console.log(`
    Servidor iniciado en:
    - Local: http://localhost:${PORT}
    - Producción: https://ligavelocidrone.onrender.com
    - Preproducción: https://ligavelocidroneprev5.onrender.com
  `);
});