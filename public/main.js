// public/main.js (solo las partes modificadas)
async function cargarMejoras() {
  const contenedor = document.getElementById('mejoras');
  if (!contenedor) return;
  contenedor.innerHTML = '<p>⏳ Cargando resultados...</p>';

  try {
    const response = await fetch('/api/tiempos-mejorados');
    const tracks = await response.json();

    contenedor.innerHTML = '';
    const ranking = {};

    tracks.forEach(track => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3>${track.escenario} - ${track.pista}</h3>
        <table>
          <thead><tr><th>Pos.</th><th>Piloto</th><th>Tiempo</th></tr></thead>
          <tbody>
            ${track.resultados.map((r, i) => {
              const puntos = [10, 9, 8, 7, 6, 5, 4, 3, 2][i] || 1;
              ranking[r.jugador] = (ranking[r.jugador] || 0) + puntos;
              return `<tr><td>${i + 1}</td><td>${r.jugador}</td><td>${formatearTiempo(r.tiempo)}</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      `;
      contenedor.appendChild(card);
    });

    // Actualizar ranking semanal (código existente)
    actualizarRankingSemanal(ranking);
  } catch (err) {
    contenedor.innerHTML = '<p>❌ Error al cargar resultados</p>';
  }
}

function formatearTiempo(ms) {
  const date = new Date(ms);
  return date.toISOString().substr(11, 8) + '.' + date.getMilliseconds().toString().padStart(3, '0');
}