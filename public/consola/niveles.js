(function () {
  const STORAGE_KEY = "gasuber_consola_api_key";
  const STORAGE_PLANTA_ID = "gasuber_consola_planta_id";
  const STORAGE_PDV_ID = "gasuber_consola_pdv_id";
  const STORAGE_AUTOTANQUE_ID = "gasuber_consola_autotanque_id";

  // Poll más conservador: suficiente para gráfica visual.
  const POLL_MS = 1000;

  const selPlanta = document.getElementById("selPlanta");
  const selPdv = document.getElementById("selPdv");
  const selAutotanque = document.getElementById("selAutotanque");
  const sidebarAutotanqueWrap = document.getElementById("sidebarAutotanqueWrap");

  const autotanqueActivoText = document.getElementById("autotanqueActivoText");
  const inpApiKey = document.getElementById("inpApiKey");
  const btnGuardarKey = document.getElementById("btnGuardarKey");
  const statusMsg = document.getElementById("statusMsg");
  const metaLine = document.getElementById("metaLine");

  const gCarb = document.getElementById("gCarb");
  const gAlm = document.getElementById("gAlm");
  const gVel = document.getElementById("gVel");

  const btnLimpiar = document.getElementById("btnLimpiar");
  const btnPausar = document.getElementById("btnPausar");

  const selVentana = document.getElementById("selVentana");
  const chkCarb = document.getElementById("chkCarb");
  const chkAlm = document.getElementById("chkAlm");
  const chkVel = document.getElementById("chkVel");
  const chartHint = document.getElementById("chartHint");

  const canvas = document.getElementById("chartCanvas");
  const ctx = canvas ? canvas.getContext("2d") : null;

  /** @type {Array<{id: string, numero?: string, placas?: string}>} */
  let lastAutotanquesList = [];
  let pollTimer = null;
  let paused = false;

  // Serie en memoria (mientras la página está abierta).
  /** @type {Array<{t: number, carb: number|null, alm: number|null, vel: number|null}>} */
  let series = [];

  function setStatus(text, kind) {
    if (!statusMsg) return;
    statusMsg.textContent = text || "";
    statusMsg.className = "status" + (kind ? " " + kind : "");
  }

  function apiHeaders() {
    const key = inpApiKey.value.trim() || sessionStorage.getItem(STORAGE_KEY);
    if (!key) throw new Error("Falta API key");
    return {
      "Content-Type": "application/json",
      "x-api-key": key,
    };
  }

  async function fetchJson(url, options) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || res.statusText || "Error HTTP");
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function fmtPct(v) {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
    return Number(v).toFixed(1);
  }

  function fmtVel(v) {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return "0.0";
    return Number(v).toFixed(1);
  }

  function normalizarNombrePdv(s) {
    const t = String(s ?? "").trim();
    if (!t) return "";
    try {
      return t
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
    } catch {
      return t.toUpperCase();
    }
  }

  function pdvSeleccionadoEsAutotanque() {
    if (!selPdv || selPdv.disabled) return false;
    const idx = selPdv.selectedIndex;
    if (idx < 0) return false;
    const opt = selPdv.options[idx];
    if (!opt) return false;
    if (!String(opt.value ?? "").trim()) return false;
    const meta = (opt.getAttribute("data-pdv-nombre") || "").trim();
    const label = (opt.textContent || "").replace(/\s+/g, " ").trim();
    return normalizarNombrePdv(meta || label) === "AUTOTANQUE";
  }

  function autotanqueIdConsola() {
    if (!pdvSeleccionadoEsAutotanque() || !selAutotanque || !selAutotanque.value || selAutotanque.disabled) {
      return "";
    }
    return String(selAutotanque.value);
  }

  function updateAutotanqueActivoLabel() {
    if (!autotanqueActivoText) return;
    const id = autotanqueIdConsola();
    if (!id) {
      autotanqueActivoText.textContent = "— Elija Planta → PDV Autotanque → número —";
      return;
    }
    const row = lastAutotanquesList.find((x) => String(x.id) === String(id));
    if (row) {
      const placas = row.placas ? ` — ${row.placas}` : "";
      autotanqueActivoText.textContent = `${row.numero || "Autotanque"}${placas}`;
    } else {
      autotanqueActivoText.textContent = `Autotanque id ${id}`;
    }
  }

  function resetPdvSelect() {
    if (!selPdv) return;
    selPdv.innerHTML = "";
    const o = document.createElement("option");
    o.value = "";
    o.textContent = "— Elija planta —";
    selPdv.appendChild(o);
    selPdv.disabled = true;
    sessionStorage.removeItem(STORAGE_PDV_ID);
    hideAutotanqueBlock();
  }

  function hideAutotanqueBlock() {
    if (sidebarAutotanqueWrap) {
      sidebarAutotanqueWrap.hidden = true;
      sidebarAutotanqueWrap.setAttribute("hidden", "");
    }
    if (selAutotanque) {
      selAutotanque.innerHTML = "";
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "— Elija PDV Autotanque —";
      selAutotanque.appendChild(o);
      selAutotanque.disabled = true;
    }
    sessionStorage.removeItem(STORAGE_AUTOTANQUE_ID);
    lastAutotanquesList = [];
    stopPolling();
    clearSerie();
    updateAutotanqueActivoLabel();
    setGauges(null);
  }

  function setGauges(t) {
    if (!t) {
      if (gCarb) gCarb.textContent = "—";
      if (gAlm) gAlm.textContent = "—";
      if (gVel) gVel.textContent = "—";
      if (metaLine) metaLine.textContent = "Seleccione un autotanque para ver niveles.";
      return;
    }
    if (gCarb) gCarb.textContent = fmtPct(t.nivel_carburacion);
    if (gAlm) gAlm.textContent = fmtPct(t.nivel_almacen);
    if (gVel) gVel.textContent = fmtVel(t.velocidad_kmh);
    if (metaLine) {
      const lat = Number(t.lat).toFixed(6);
      const lon = Number(t.lon).toFixed(6);
      const fixTxt =
        Number(t.lat) === 0 && Number(t.lon) === 0 ? " (sin fix — coordenadas en 0)" : "";
      metaLine.textContent = `GPS: ${lat}°, ${lon}°${fixTxt} · nivel (compat): ${fmtPct(t.nivel)}% · placas: ${t.placa}${t.fecha ? " · último dato GPS: " + t.fecha : ""}`;
    }
  }

  function clearSerie() {
    series = [];
    drawChart();
  }

  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    paused = false;
    if (btnPausar) btnPausar.textContent = "Pausar";
    if (btnPausar) btnPausar.disabled = true;
    if (btnLimpiar) btnLimpiar.disabled = true;
  }

  function startPollingIfReady() {
    const atq = autotanqueIdConsola();
    if (!atq) {
      stopPolling();
      return;
    }
    if (pollTimer) clearInterval(pollTimer);
    if (btnPausar) btnPausar.disabled = false;
    if (btnLimpiar) btnLimpiar.disabled = false;
    void pollOnce();
    pollTimer = setInterval(pollOnce, POLL_MS);
  }

  function windowSeconds() {
    const raw = selVentana && selVentana.value ? Number(selVentana.value) : 900;
    return Number.isFinite(raw) && raw > 10 ? raw : 900;
  }

  function trimToWindow(nowMs) {
    const w = windowSeconds() * 1000;
    const minT = nowMs - w;
    // recorta al frente
    let idx = 0;
    while (idx < series.length && series[idx].t < minT) idx++;
    if (idx > 0) series = series.slice(idx);
  }

  async function pollOnce() {
    if (paused) return;
    const atq = autotanqueIdConsola();
    if (!atq) return;
    try {
      if (chartHint) chartHint.textContent = "";
      const data = await fetchJson("/api/consola/telemetria-autotanque/" + encodeURIComponent(atq), {
        headers: apiHeaders(),
      });

      if (data.sin_tarjeta_asignada) {
        setGauges(null);
        if (chartHint) {
          chartHint.textContent = "Sin tarjeta RPI asignada: no hay telemetría para graficar.";
        }
        return;
      }

      const t = data.telemetria;
      setGauges(t);

      const now = Date.now();
      const point = {
        t: now,
        carb: t && t.nivel_carburacion != null ? Number(t.nivel_carburacion) : null,
        alm: t && t.nivel_almacen != null ? Number(t.nivel_almacen) : null,
        vel: t && t.velocidad_kmh != null ? Number(t.velocidad_kmh) : null,
      };
      series.push(point);
      trimToWindow(now);
      drawChart();
    } catch (e) {
      if (e.status === 401) setStatus("API key no válida o no autorizada.", "err");
      else setStatus("Error leyendo telemetría: " + (e.message || String(e)), "err");
    }
  }

  function maxVelInWindow() {
    let max = 0;
    for (const p of series) {
      if (p.vel != null && Number.isFinite(p.vel)) max = Math.max(max, p.vel);
    }
    // evita 0 para que se vea escala
    if (max < 10) return 10;
    // redondeo a múltiplos bonitos
    if (max <= 60) return 60;
    if (max <= 120) return 120;
    if (max <= 200) return 200;
    return 300;
  }

  function drawChart() {
    if (!ctx || !canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Fondo
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(18, 24, 32, 0.95)");
    grad.addColorStop(1, "rgba(10, 14, 20, 0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const padL = 56;
    const padR = 16;
    const padT = 18;
    const padB = 36;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    // Ejes/grid
    ctx.strokeStyle = "rgba(57, 197, 207, 0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(padL, padT, plotW, plotH);
    ctx.stroke();

    // grid horizontal (0..100%)
    for (let i = 0; i <= 5; i++) {
      const y = padT + (plotH * i) / 5;
      ctx.strokeStyle = i === 5 ? "rgba(57, 197, 207, 0.18)" : "rgba(57, 197, 207, 0.10)";
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
    }

    // labels izquierda (%)
    ctx.fillStyle = "rgba(230, 237, 243, 0.72)";
    ctx.font = '12px "Share Tech Mono", ui-monospace, monospace';
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 5; i++) {
      const pct = 100 - i * 20;
      const y = padT + (plotH * i) / 5;
      ctx.fillText(String(pct), padL - 10, y);
    }

    // labels derecha (velocidad)
    const vMax = maxVelInWindow();
    ctx.textAlign = "left";
    for (let i = 0; i <= 5; i++) {
      const vv = vMax - (vMax * i) / 5;
      const y = padT + (plotH * i) / 5;
      ctx.fillText(String(Math.round(vv)), padL + plotW + 8, y);
    }

    // Sin datos
    if (!series.length) {
      ctx.fillStyle = "rgba(139, 156, 179, 0.9)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = '14px Orbitron, sans-serif';
      ctx.fillText("Esperando datos…", padL + plotW / 2, padT + plotH / 2);
      return;
    }

    const tMin = series[0].t;
    const tMax = series[series.length - 1].t;
    const span = Math.max(1, tMax - tMin);

    const xForT = (t) => padL + ((t - tMin) / span) * plotW;
    const yForPct = (v) => padT + (1 - Math.max(0, Math.min(100, v)) / 100) * plotH;
    const yForVel = (v) => padT + (1 - Math.max(0, Math.min(vMax, v)) / vMax) * plotH;

    // X ticks (tiempo)
    ctx.fillStyle = "rgba(139, 156, 179, 0.9)";
    ctx.font = '11px "Share Tech Mono", ui-monospace, monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const ticks = 6;
    for (let i = 0; i <= ticks; i++) {
      const x = padL + (plotW * i) / ticks;
      const t = tMin + (span * i) / ticks;
      const d = new Date(t);
      const label = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
      ctx.fillText(label, x, padT + plotH + 10);
    }

    // Series
    const showCarb = chkCarb ? chkCarb.checked : true;
    const showAlm = chkAlm ? chkAlm.checked : true;
    const showVel = chkVel ? chkVel.checked : true;

    const drawLine = (getter, yFn, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      for (const p of series) {
        const v = getter(p);
        if (v == null || !Number.isFinite(v)) continue;
        const x = xForT(p.t);
        const y = yFn(v);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      if (started) ctx.stroke();
    };

    if (showCarb) drawLine((p) => p.carb, yForPct, "rgba(63, 185, 80, 0.95)"); // verde
    if (showAlm) drawLine((p) => p.alm, yForPct, "rgba(57, 197, 207, 0.95)"); // cian
    if (showVel) drawLine((p) => p.vel, yForVel, "rgba(121, 192, 255, 0.95)"); // azul

    // Leyenda
    const legend = [];
    if (showCarb) legend.push("Carb");
    if (showAlm) legend.push("Alm");
    if (showVel) legend.push("Vel");
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(230, 237, 243, 0.75)";
    ctx.font = '12px Orbitron, sans-serif';
    ctx.fillText(legend.join(" · "), padL + 10, padT + 6);
  }

  async function cargarPdv(plantaId, restorePdv) {
    if (!selPdv) return;
    if (!plantaId) {
      resetPdvSelect();
      return;
    }
    try {
      const data = await fetchJson("/api/consola/pdv?planta_id=" + encodeURIComponent(plantaId), {
        headers: apiHeaders(),
      });
      selPdv.innerHTML = "";
      const pdvs = data.pdvs || [];
      if (!pdvs.length) {
        const o = document.createElement("option");
        o.value = "";
        o.textContent = "Sin PDV para esta planta";
        selPdv.appendChild(o);
        selPdv.disabled = true;
        sessionStorage.removeItem(STORAGE_PDV_ID);
        hideAutotanqueBlock();
        return;
      }
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "— Seleccione PDV —";
      selPdv.appendChild(empty);
      for (const p of pdvs) {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.nombre;
        opt.setAttribute("data-pdv-nombre", p.nombre != null ? String(p.nombre) : "");
        selPdv.appendChild(opt);
      }
      selPdv.disabled = false;
      if (restorePdv) {
        const saved = sessionStorage.getItem(STORAGE_PDV_ID);
        if (saved && pdvs.some((x) => String(x.id) === String(saved))) {
          selPdv.value = saved;
        } else {
          sessionStorage.removeItem(STORAGE_PDV_ID);
        }
      } else {
        sessionStorage.removeItem(STORAGE_PDV_ID);
      }
      await syncAutotanqueUI(true);
    } catch (e) {
      selPdv.innerHTML = "";
      const o = document.createElement("option");
      o.value = "";
      o.textContent = e.status === 401 ? "API key no válida" : "Error cargando PDV";
      selPdv.appendChild(o);
      selPdv.disabled = true;
      sessionStorage.removeItem(STORAGE_PDV_ID);
      hideAutotanqueBlock();
      if (e.status !== 401) console.warn("[niveles] cargarPdv:", e);
    }
  }

  async function cargarPlantas() {
    if (!selPlanta || !selPdv) return;
    try {
      const data = await fetchJson("/api/consola/plantas", { headers: apiHeaders() });
      selPlanta.innerHTML = "";
      const plantas = data.plantas || [];
      if (!plantas.length) {
        const o = document.createElement("option");
        o.value = "";
        o.textContent = "Sin plantas en BD";
        selPlanta.appendChild(o);
        resetPdvSelect();
        return;
      }
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "— Seleccione planta —";
      selPlanta.appendChild(empty);
      for (const p of plantas) {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.nombre;
        selPlanta.appendChild(opt);
      }
      const savedPlanta = sessionStorage.getItem(STORAGE_PLANTA_ID);
      if (savedPlanta && plantas.some((x) => String(x.id) === String(savedPlanta))) {
        selPlanta.value = savedPlanta;
        await cargarPdv(savedPlanta, true);
      } else {
        sessionStorage.removeItem(STORAGE_PLANTA_ID);
        resetPdvSelect();
      }
    } catch (e) {
      selPlanta.innerHTML = "";
      const o = document.createElement("option");
      o.value = "";
      const hint = e.data && e.data.hint;
      const apiErr = e.data && e.data.error;
      o.textContent =
        e.status === 401 ? "API key no válida" : hint ? "Falta crear tablas (ver aviso)" : "Error cargando plantas";
      selPlanta.appendChild(o);
      resetPdvSelect();
      if (hint || apiErr) setStatus([apiErr, hint].filter(Boolean).join(" — "), "err");
      else if (e.status !== 401) setStatus(e.message || "Error cargando plantas", "err");
      if (e.status !== 401) console.warn("[niveles] cargarPlantas:", e);
    }
  }

  async function cargarAutotanques(plantaId, restoreAutotanque) {
    if (!selAutotanque || !sidebarAutotanqueWrap) return;
    if (!restoreAutotanque) sessionStorage.removeItem(STORAGE_AUTOTANQUE_ID);
    try {
      const data = await fetchJson(
        "/api/consola/pdv-autotanque?planta_id=" + encodeURIComponent(plantaId),
        { headers: apiHeaders() }
      );
      selAutotanque.innerHTML = "";
      const list = data.autotanques || [];
      lastAutotanquesList = list;
      if (!list.length) {
        const o = document.createElement("option");
        o.value = "";
        o.textContent = "Sin autotanques en BD";
        selAutotanque.appendChild(o);
        selAutotanque.disabled = true;
        sessionStorage.removeItem(STORAGE_AUTOTANQUE_ID);
        stopPolling();
        clearSerie();
        setGauges(null);
        return;
      }
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "— Seleccione número —";
      selAutotanque.appendChild(empty);
      for (const row of list) {
        const opt = document.createElement("option");
        opt.value = row.id;
        opt.textContent = row.numero;
        selAutotanque.appendChild(opt);
      }
      selAutotanque.disabled = false;
      if (restoreAutotanque) {
        const saved = sessionStorage.getItem(STORAGE_AUTOTANQUE_ID);
        if (saved && list.some((x) => String(x.id) === String(saved))) {
          selAutotanque.value = saved;
        } else {
          sessionStorage.removeItem(STORAGE_AUTOTANQUE_ID);
        }
      }
      updateAutotanqueActivoLabel();
      startPollingIfReady();
    } catch (e) {
      selAutotanque.innerHTML = "";
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "Error cargando autotanques";
      selAutotanque.appendChild(o);
      selAutotanque.disabled = true;
      sessionStorage.removeItem(STORAGE_AUTOTANQUE_ID);
      stopPolling();
      clearSerie();
      setGauges(null);
      if (e.status !== 401) console.warn("[niveles] cargarAutotanques:", e);
      lastAutotanquesList = [];
    }
  }

  async function syncAutotanqueUI(restoreAutotanque) {
    if (!sidebarAutotanqueWrap || !selAutotanque) return;
    if (!pdvSeleccionadoEsAutotanque()) {
      hideAutotanqueBlock();
      if (chartHint) chartHint.textContent = "Seleccione PDV = AUTOTANQUE para ver niveles en vivo.";
      return;
    }
    const plantaId = selPlanta && selPlanta.value;
    if (!plantaId) {
      sidebarAutotanqueWrap.hidden = true;
      hideAutotanqueBlock();
      return;
    }
    sidebarAutotanqueWrap.removeAttribute("hidden");
    sidebarAutotanqueWrap.hidden = false;
    await cargarAutotanques(plantaId, restoreAutotanque);
  }

  function bootstrapLockedUI() {
    if (selPlanta) {
      selPlanta.innerHTML = "";
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "— Guarde la API key —";
      selPlanta.appendChild(o);
      selPlanta.disabled = true;
    }
    resetPdvSelect();
    setGauges(null);
    clearSerie();
    stopPolling();
  }

  async function bootstrap() {
    inpApiKey.value = sessionStorage.getItem(STORAGE_KEY) || "";
    if (!inpApiKey.value.trim()) {
      setStatus("Introduce la API key y pulsa «Guardar clave».", "");
      bootstrapLockedUI();
      return;
    }
    if (selPlanta) selPlanta.disabled = false;
    setStatus("", "");
    if (chartHint) chartHint.textContent = "Seleccione un autotanque para iniciar la gráfica.";
    await cargarPlantas();
    drawChart();
  }

  // Eventos UI
  if (btnGuardarKey) {
    btnGuardarKey.addEventListener("click", () => {
      const k = inpApiKey.value.trim();
      if (k) sessionStorage.setItem(STORAGE_KEY, k);
      setStatus("Clave guardada en este navegador.", "ok");
      if (selPlanta) selPlanta.disabled = false;
      bootstrap();
    });
  }

  if (selPlanta) {
    selPlanta.addEventListener("change", async () => {
      const id = selPlanta.value;
      if (!id) {
        sessionStorage.removeItem(STORAGE_PLANTA_ID);
        resetPdvSelect();
        setGauges(null);
        clearSerie();
        stopPolling();
        return;
      }
      sessionStorage.setItem(STORAGE_PLANTA_ID, id);
      await cargarPdv(id, false);
    });
  }

  if (selPdv) {
    let raf = 0;
    const onPdv = () => {
      if (selPdv.value) sessionStorage.setItem(STORAGE_PDV_ID, selPdv.value);
      else sessionStorage.removeItem(STORAGE_PDV_ID);
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        void syncAutotanqueUI(true);
      });
    };
    selPdv.addEventListener("change", onPdv);
    selPdv.addEventListener("input", onPdv);
  }

  if (selAutotanque) {
    selAutotanque.addEventListener("change", () => {
      if (selAutotanque.value) sessionStorage.setItem(STORAGE_AUTOTANQUE_ID, selAutotanque.value);
      else sessionStorage.removeItem(STORAGE_AUTOTANQUE_ID);
      updateAutotanqueActivoLabel();
      clearSerie();
      startPollingIfReady();
      setStatus("", "");
    });
  }

  if (btnLimpiar) btnLimpiar.addEventListener("click", () => clearSerie());

  if (btnPausar) {
    btnPausar.addEventListener("click", () => {
      paused = !paused;
      btnPausar.textContent = paused ? "Reanudar" : "Pausar";
      if (!paused) void pollOnce();
    });
  }

  const redraw = () => drawChart();
  if (selVentana) selVentana.addEventListener("change", () => {
    // recorta a nueva ventana y redibuja
    trimToWindow(Date.now());
    drawChart();
  });
  if (chkCarb) chkCarb.addEventListener("change", redraw);
  if (chkAlm) chkAlm.addEventListener("change", redraw);
  if (chkVel) chkVel.addEventListener("change", redraw);
  window.addEventListener("resize", () => {
    // canvas mantiene tamaño fijo; redibuja por si cambia pixel ratio (simplificado)
    drawChart();
  });

  // init
  bootstrap();
})();

