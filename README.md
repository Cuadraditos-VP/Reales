# Reales, dólares y pesos

App web simple para saber qué conviene al pagar en Brasil: con pesos o con dólares.

- Pestañas para cargar el monto en **reales**, **pesos** o **dólares**.
- Compara pagar en pesos (cotización del real) contra pagar con dólares (Dólar REBA → reales) y marca cuál conviene.
- Muestra el **dólar de equilibrio**: con el REBA por debajo conviene usar dólares; por encima, pesos.
- Cotizaciones automáticas, con la opción de corregirlas a mano (ver abajo). Lo que cargás se guarda en el dispositivo (`localStorage`).
- Instalable en el celular y funciona sin internet.

## Publicarla (GitHub Pages)

**Settings → Pages** → Source: *Deploy from a branch* → branch `main`, folder `/ (root)`.
En uno o dos minutos queda en `https://<usuario>.github.io/reales/`.

## Instalarla en el celular

- **Android (Chrome):** menú ⋮ → *Instalar app*.
- **iPhone (Safari):** Compartir → *Agregar a inicio*.

## Cotizaciones automáticas

Una acción de GitHub (`.github/workflows/cotizaciones.yml`) corre cada 15 minutos `scripts/cotizaciones.mjs`, que actualiza `cotizaciones.json`:

- **Dólar REBA (venta):** de [dolarito.ar](https://www.dolarito.ar/cotizacion/dolar/banco/reba) e [infodolar.com](https://www.infodolar.com/cotizacion-dolar-entidad-reba.aspx) (la publicación más reciente), porque reba.com.ar no deja leer su página.
- **1 dólar en reales y 1 real en pesos:** Prex no las publica (solo se ven en su app), así que se usa la cotización de mercado de [open.er-api.com](https://open.er-api.com) más un **ajuste**.

El ajuste se calibra solo: cuando escribís a mano lo que te muestra Prex, la app guarda la diferencia con el mercado (por ejemplo, −5%) y la aplica en las próximas actualizaciones. Si escribís otro valor de REBA, también queda como ajuste.

La acción corre solo en la rama `main`. Para correrla a mano: **Actions → Actualizar cotizaciones → Run workflow**.
