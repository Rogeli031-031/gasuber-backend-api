import cron from "node-cron";
import { barridoAlarmasInformacionAutotanqueTodasLasPlantas } from "../services/informacionAutotanque.service";

/**
 * Barrido diario a las 05:00 (zona configurable) para recalcular alarmas de expediente
 * autotanque en `Alarmas` (equivalente a abrir la consola, pero sin intervención humana).
 */
export function startInformacionAlarmasSweepJob(): void {
  const off = process.env.DISABLE_INFORMACION_ALARM_SWEEP;
  if (off === "1" || off === "true" || off === "yes") {
    console.log("[informacion-alarmas] barrido programado desactivado (DISABLE_INFORMACION_ALARM_SWEEP)");
    return;
  }

  const tz = process.env.INFORMACION_ALARM_SWEEP_TZ || "America/Mexico_City";

  cron.schedule(
    "0 5 * * *",
    async () => {
      try {
        const r = await barridoAlarmasInformacionAutotanqueTodasLasPlantas();
        console.log(
          `[informacion-alarmas] barrido 05:00 (${tz}) ok — plantas=${r.plantas} filas_alarma=${r.total_alarmas}`
        );
      } catch (e) {
        console.error("[informacion-alarmas] barrido 05:00 falló:", e);
      }
    },
    { timezone: tz }
  );

  console.log(`[informacion-alarmas] programado: todos los días a las 05:00 (${tz})`);
}
