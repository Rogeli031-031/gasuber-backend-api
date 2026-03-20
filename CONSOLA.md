# Consola web (telemetría + inicio de ruta)

## URL

- Local: `http://localhost:3000/consola/`
- Producción: `https://TU-DOMINIO/consola/`

La página raíz `/` incluye un enlace a la consola.

## Base de datos

**Obligatorio** para el botón «Inicio de ruta»: la tabla `eventos_inicio_ruta`. Si solo migraste GPS pero no esta migración, la consola verá telemetría en vivo pero fallará al guardar con *Error guardando evento*.

Ejecutar en la misma base que usa `DATABASE_URL` (local o Render):

```bash
cd backend-api
node scripts/migrate.cjs --file=sql/007_eventos_inicio_ruta.sql
```

En **Render**: conecta con la URL interna de Postgres o desde tu PC apuntando a la `DATABASE_URL` externa y ejecuta el comando anterior una vez.

## Variables de entorno

- `API_KEY_RASPBERRY`: obligatoria para `/api/gps` (Raspberry).
- `API_KEY_CONSOLE` (opcional): si existe, la consola web debe usar **esta** clave en el campo “API key”. Si no existe, la consola acepta la misma `API_KEY_RASPBERRY`.
- `TELEMETRY_STALE_SECONDS` (opcional, por defecto **90**): si el último `fecha` en `gps_unidades` es más antiguo que estos segundos, el indicador **Raspberry** en la consola pasa a rojo (“sin datos recientes”). Ajusta si la Pi envía cada muchos segundos (p. ej. `120`).

Header en todas las peticiones de consola: `x-api-key: <clave>`.

## API `/api/gps` (Raspberry)

- **GET `/api/gps/health`** — sin API key; responde `{ ok: true, service: "gps", time: "..." }`. Úsalo desde la Pi para comprobar DNS/HTTPS antes de depurar el POST.
- **POST `/api/gps`** — header `x-api-key: <API_KEY_RASPBERRY>`, cuerpo JSON (o `application/x-www-form-urlencoded`) con al menos `unidad_id` (igual que `unidades.clave`), `lat`, `lon`, y `nivel` **o** ambos `nivel_carburacion` y `nivel_almacen`. **Velocidad:** se guarda en `velocidad_kmh`; si no envías ningún campo de velocidad, el servidor guarda **0**. También se aceptan alias: `vel`, `speed`, `velocidad`, `kmh`, `speed_kmh` (se usa el primero definido).

Ejemplo con `curl` (sustituye URL, clave y unidad):

```bash
curl -sS "https://TU-DOMINIO/api/gps/health"
curl -sS -X POST "https://TU-DOMINIO/api/gps" \
  -H "Content-Type: application/json" \
  -H "x-api-key: TU_API_KEY_RASPBERRY" \
  -d '{"unidad_id":"ATQ-01","lat":19.11,"lon":-98.22,"nivel_carburacion":40,"nivel_almacen":77,"velocidad_kmh":0}'
```

## API `/api/consola`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/unidades` | Lista unidades (`clave`, `placa`, `estado`) |
| GET | `/telemetria/:clave` | Último estado en `gps_unidades` + objeto `raspberry` (¿datos recientes según `fecha`?) |
| GET | `/eventos?unidad_clave=&limit=` | Historial de inicios de ruta |
| POST | `/inicio-ruta` | Inserta fila en `eventos_inicio_ruta` |

El cuerpo de `POST /inicio-ruta` debe incluir al menos: `unidad_id`, `lat`, `lon`, `nivel`, y opcionalmente `nivel_carburacion`, `nivel_almacen`, `velocidad_kmh`, `satelites`, `gps_fix`.

## Comportamiento

- La consola consulta telemetría cada **0,5 s**; no inserta historial en ese intervalo.
- Cada clic en **Guardar en base de datos** crea un registro en `eventos_inicio_ruta` y apila el evento en pantalla.
- **Indicador Raspberry (esquina superior derecha):** la web solo lee la base de datos. Verde = la Pi está enviando `POST /api/gps` con frecuencia suficiente (columna `fecha` reciente). Rojo = no hay fila GPS o el último envío es viejo (revisa script en la Pi, red, `API_KEY_RASPBERRY` y URL del backend).
