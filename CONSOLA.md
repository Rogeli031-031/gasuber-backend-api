# Consola web (telemetría + inicio de ruta)

## URL

- Local: `http://localhost:3000/consola/`
- Producción: `https://TU-DOMINIO/consola/`

La página raíz `/` incluye un enlace a la consola.

## Base de datos

Ejecutar la migración de historial:

```bash
cd backend-api
node scripts/migrate.cjs --file=sql/007_eventos_inicio_ruta.sql
```

## Variables de entorno

- `API_KEY_RASPBERRY`: obligatoria para `/api/gps` (Raspberry).
- `API_KEY_CONSOLE` (opcional): si existe, la consola web debe usar **esta** clave en el campo “API key”. Si no existe, la consola acepta la misma `API_KEY_RASPBERRY`.
- `TELEMETRY_STALE_SECONDS` (opcional, por defecto **90**): si el último `fecha` en `gps_unidades` es más antiguo que estos segundos, el indicador **Raspberry** en la consola pasa a rojo (“sin datos recientes”). Ajusta si la Pi envía cada muchos segundos (p. ej. `120`).

Header en todas las peticiones de consola: `x-api-key: <clave>`.

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
