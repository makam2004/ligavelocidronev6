// index.js (en la raíz del proyecto)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import supabase from './supabaseClient.js';
import tiemposMejorados from './routes/tiemposMejorados.js';
import adminRoutes from './routes/admin.js';
import rankingRoutes from './routes/ranking.js';
import commitRankingRoutes from './routes/commit_ranking.js';
import telegramRoutes from './routes/telegram.js';
import checkMejoras from "./routes/checkMejoras.js";
import './services/bot.js';
import rankingAnualRouter from './routes/rankingAnual.js';
import configuracionRouter from './routes/configuracion.js';
import tracksRouter from './routes/tracks.js'; // 👈 Nueva importación

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ✅ Alta de jugador con verificación hCaptcha (tu código existente...)

// ✅ Configuración de rutas (AÑADE tracksRouter aquí)
app.use(tiemposMejorados);
app.use(adminRoutes); 
app.use(rankingRoutes);
app.use(commitRankingRoutes);
app.use(telegramRoutes);
app.use(checkMejoras);
app.use(rankingAnualRouter);
app.use(configuracionRouter);
app.use(tracksRouter); // 👈 Nueva ruta para gestión de tracks

// ✅ Endpoint para exponer credenciales Supabase al frontend (anon)
app.get("/api/supabase-credentials", (req, res) => {
  res.json({
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY
  });
});

// ✅ Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});