// Actualiza cotizaciones.json con:
//  - mercado: 1 dólar en reales y 1 real en pesos (open.er-api.com). La app les aplica
//    el ajuste que calibrás contra lo que te muestra Prex.
//  - reba: dólar REBA, precio de venta (dolarito.ar e infodolar.com, porque reba.com.ar bloquea accesos automáticos).
// Si una fuente falla, deja el valor anterior de esa parte y sigue con la otra.
// Uso: node scripts/cotizaciones.mjs   (lo corre la acción de GitHub cada 15 minutos)
import { readFile, writeFile } from 'node:fs/promises';

const ARCHIVO = new URL('../cotizaciones.json', import.meta.url);
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; reales-cotizaciones)' };

async function mercado() {
  const r = await fetch('https://open.er-api.com/v6/latest/USD', { headers: UA });
  if (!r.ok) throw new Error('open.er-api.com respondió ' + r.status);
  const j = await r.json();
  const brl = j?.rates?.BRL, ars = j?.rates?.ARS;
  if (j.result !== 'success' || !(brl > 0) || !(ars > 0)) throw new Error('open.er-api.com: datos incompletos');
  return {
    usdBrl: +brl.toFixed(4),
    brlArs: +(ars / brl).toFixed(2),
    fecha: new Date(j.time_last_update_unix * 1000).toISOString(),
    fuente: 'open.er-api.com',
  };
}

// "1.590" o "1.590,50" -> 1590 / 1590.5
const numAR = s => parseFloat(s.replace(/\./g, '').replace(',', '.'));

// REBA: se consulta dolarito.ar e infodolar.com y se queda con la publicación más reciente.
async function rebaDolarito() {
  const r = await fetch('https://www.dolarito.ar/cotizacion/dolar/banco/reba', { headers: UA });
  if (!r.ok) throw new Error('dolarito.ar respondió ' + r.status);
  const html = await r.text();
  const venta = html.match(/venta en Reba hoy es de \$\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?)/i);
  const compra = html.match(/compra \(\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\)/i);
  const fecha = html.match(/"dateModified":"([^"]+)"/);
  const v = venta && numAR(venta[1]);
  if (!(v > 100)) throw new Error('dolarito.ar: no encontré el precio de venta de REBA');
  return { venta: v, compra: compra ? numAR(compra[1]) : null, fecha: fecha ? fecha[1] : new Date().toISOString(), fuente: 'dolarito.ar' };
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
async function rebaInfodolar() {
  const r = await fetch('https://www.infodolar.com/cotizacion-dolar-entidad-reba.aspx', { headers: UA });
  if (!r.ok) throw new Error('infodolar.com respondió ' + r.status);
  const txt = (await r.text()).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  // "... 20 de noviembre de 2026 15:30 Argentina $ 1.550,00 $ 40,00 $ 1.595,00 ..." (compra, variación, venta)
  const m = txt.match(/(\d{1,2}) de (\p{L}+) de (\d{4}) (\d{1,2}):(\d{2}) Argentina \$ ([\d.,]+) \$ -?[\d.,]+ \$ ([\d.,]+)/u);
  const mes = m && MESES.indexOf(m[2].toLowerCase());
  const v = m && numAR(m[7]);
  if (!(v > 100) || mes < 0) throw new Error('infodolar.com: no encontré el precio de venta de REBA');
  const fecha = new Date(Date.UTC(+m[3], mes, +m[1], +m[4] + 3, +m[5])).toISOString(); // hora argentina = UTC-3
  return { venta: v, compra: numAR(m[6]), fecha, fuente: 'infodolar.com' };
}

async function reba() {
  const res = await Promise.allSettled([rebaDolarito(), rebaInfodolar()]);
  const ok = res.filter(x => x.status === 'fulfilled').map(x => x.value);
  res.filter(x => x.status === 'rejected').forEach(x => console.error('reba:', x.reason.message));
  if (!ok.length) throw new Error('ninguna fuente de REBA respondió');
  ok.forEach(x => console.log('  ', x.fuente, x.venta, x.fecha));
  return ok.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
}

let datos = {};
try { datos = JSON.parse(await readFile(ARCHIVO, 'utf8')); } catch {}

let errores = 0;
for (const [k, fn] of [['mercado', mercado], ['reba', reba]]) {
  try { datos[k] = await fn(); console.log(k, datos[k]); }
  catch (e) { errores++; console.error(k + ':', e.message); }
}
if (errores === 2) process.exit(1);

await writeFile(ARCHIVO, JSON.stringify(datos, null, 2) + '\n');
