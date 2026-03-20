(function () {
  const STORAGE_KEY = "gasuber_consola_api_key";
  const POLL_MS = 500;

  const selUnidad = document.getElementById("selUnidad");
  const inpApiKey = document.getElementById("inpApiKey");
  const btnGuardarKey = document.getElementById("btnGuardarKey");
  const gCarb = document.getElementById("gCarb");
  const gAlm = document.getElementById("gAlm");
  const gVel = document.getElementById("gVel");
  const metaLine = document.getElementById("metaLine");
  const btnInicioRuta = document.getElementById("btnInicioRuta");
  const btnPedido = document.getElementById("btnPedido");
  const statusMsg = document.getElementById("statusMsg");
  const eventStack = document.getElementById("eventStack");
  const pedidoStack = document.getElementById("pedidoStack");
  const raspberryIndicator = document.getElementById("raspberryIndicator");
  const raspberryText = document.getElementById("raspberryText");
  const raspberryHint = document.getElementById("raspberryHint");

  /** @type {{ telemetria: object | null, clave: string }} */
  let snapshot = { telemetria: null, clave: "" };
  let pollTimer = null;
  let saving = false;
  let pedidoSaving = false;
  let pedidoEstadoSaving = false;

  const pedidoModal = document.getElementById("pedidoModal");
  const pedidoForm = document.getElementById("pedidoForm");
  const btnPedidoCancelar = document.getElementById("btnPedidoCancelar");
  const btnPedidoGuardar = document.getElementById("btnPedidoGuardar");
  const pedidoStatusMsg = document.getElementById("pedidoStatusMsg");

  const inpClienteNombre = document.getElementById("inpClienteNombre");
  const inpTelefonoOrigen = document.getElementById("inpTelefonoOrigen");
  const inpColonia = document.getElementById("inpColonia");
  const inpCalle = document.getElementById("inpCalle");
  const inpCp = document.getElementById("inpCp");
  const inpNumExterior = document.getElementById("inpNumExterior");
  const inpNumInterior = document.getElementById("inpNumInterior");
  const selTipoOrigen = document.getElementById("selTipoOrigen");
  const inpNombreEmpresa = document.getElementById("inpNombreEmpresa");
  const inpLitrosSolicitados = document.getElementById("inpLitrosSolicitados");

  // Asegura que el modal esté cerrado siempre al cargar (evita que quede abierto por estado previo).
  if (pedidoModal) pedidoModal.hidden = true;

  function apiHeaders() {
    const key = inpApiKey.value.trim() || sessionStorage.getItem(STORAGE_KEY);
    if (!key) throw new Error("Falta API key");
    return {
      "Content-Type": "application/json",
      "x-api-key": key,
    };
  }

  function setStatus(text, kind) {
    statusMsg.textContent = text || "";
    statusMsg.className = "status" + (kind ? " " + kind : "");
  }

  function setPedidoStatus(text, kind) {
    if (!pedidoStatusMsg) return;
    pedidoStatusMsg.textContent = text || "";
    pedidoStatusMsg.className = "status" + (kind ? " " + kind : "");
  }

  function fmtPct(v) {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
    return Number(v).toFixed(1);
  }

  function fmtVel(v) {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return "0";
    return Number(v).toFixed(1);
  }

  function setRaspberryIndicator(r) {
    if (!raspberryIndicator || !raspberryText) return;
    raspberryIndicator.classList.remove("ok", "warn", "bad");
    if (raspberryHint) {
      raspberryHint.hidden = true;
      raspberryHint.textContent = "";
    }
    if (!r || r.sin_fila_gps) {
      raspberryIndicator.classList.add("bad");
      raspberryText.textContent = "Raspberry: sin datos en servidor";
      if (raspberryHint) {
        raspberryHint.hidden = false;
        raspberryHint.textContent =
          "La Pi debe enviar POST /api/gps con header x-api-key (API_KEY_RASPBERRY) y unidad_id igual a la clave de la unidad. Prueba GET /api/gps/health para verificar la URL del backend.";
      }
      return;
    }
    if (r.recibiendo_datos) {
      raspberryIndicator.classList.add("ok");
      const s = r.segundos_desde_ultimo_envio;
      raspberryText.textContent =
        s != null
          ? `Raspberry: enviando (hace ${s}s · umbral ${r.umbral_segundos}s)`
          : "Raspberry: enviando";
      return;
    }
    raspberryIndicator.classList.add("bad");
    const s = r.segundos_desde_ultimo_envio;
    raspberryText.textContent =
      s != null
        ? `Raspberry: sin datos recientes (hace ${s}s · umbral ${r.umbral_segundos}s)`
        : "Raspberry: datos desactualizados";
    if (raspberryHint) {
      raspberryHint.hidden = false;
      raspberryHint.textContent =
        "El último envío a la base de datos es anterior al umbral. Comprueba que la Raspberry esté encendida, con red, que el script use la misma URL y clave que el servidor, y que unidad_id coincida con la unidad seleccionada.";
    }
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

  async function cargarUnidades() {
    try {
      const data = await fetchJson("/api/consola/unidades", {
        headers: apiHeaders(),
      });
      selUnidad.innerHTML = "";
      for (const u of data.unidades || []) {
        const opt = document.createElement("option");
        opt.value = u.clave;
        opt.textContent = `${u.clave} — ${u.placa} (${u.estado})`;
        selUnidad.appendChild(opt);
      }
      if (data.unidades?.length) {
        btnInicioRuta.disabled = false;
        iniciarPoll();
      }
    } catch (e) {
      setStatus(e.message || String(e), "err");
    }
  }

  async function pollTelemetria() {
    const clave = selUnidad.value;
    if (!clave) return;
    try {
      const data = await fetchJson(
        "/api/consola/telemetria/" + encodeURIComponent(clave),
        { headers: apiHeaders() }
      );
      const t = data.telemetria;
      snapshot = { telemetria: t, clave };

      setRaspberryIndicator(data.raspberry);

      gCarb.textContent = fmtPct(t.nivel_carburacion);
      gAlm.textContent = fmtPct(t.nivel_almacen);
      gVel.textContent = fmtVel(t.velocidad_kmh);

      const lat = Number(t.lat).toFixed(6);
      const lon = Number(t.lon).toFixed(6);
      const fixTxt =
        Number(t.lat) === 0 && Number(t.lon) === 0
          ? " (sin fix — coordenadas en 0)"
          : "";
      metaLine.textContent = `GPS: ${lat}°, ${lon}°${fixTxt} · nivel (compat): ${fmtPct(t.nivel)}% · placa: ${t.placa}${t.fecha ? " · último dato GPS: " + t.fecha : ""}`;
    } catch (e) {
      if (e.status === 401) {
        setStatus("API key no válida o no autorizada.", "err");
        return;
      }
      setStatus("Sin telemetría: " + (e.message || String(e)), "err");
      setRaspberryIndicator(null);
    }
  }

  function iniciarPoll() {
    if (pollTimer) clearInterval(pollTimer);
    pollTelemetria();
    pollTimer = setInterval(pollTelemetria, POLL_MS);
  }

  function renderEventCard(ev) {
    const card = document.createElement("article");
    card.className = "event-card";
    card.innerHTML = `
      <h3>Inicio de ruta</h3>
      <div class="ts">Registrado: ${escapeHtml(ev.created_at)} · ID #${escapeHtml(String(ev.id))}</div>
      <dl>
        <dt>Unidad</dt><dd>${escapeHtml(ev.unidad_clave)}</dd>
        <dt>Lat / Lon</dt><dd>${escapeHtml(String(ev.lat))}, ${escapeHtml(String(ev.lon))}</dd>
        <dt>Nivel (compat)</dt><dd>${escapeHtml(String(ev.nivel))} %</dd>
        <dt>Carburación</dt><dd>${ev.nivel_carburacion != null ? escapeHtml(String(ev.nivel_carburacion)) + " %" : "—"}</dd>
        <dt>Almacén</dt><dd>${ev.nivel_almacen != null ? escapeHtml(String(ev.nivel_almacen)) + " %" : "—"}</dd>
        <dt>Velocidad</dt><dd>${ev.velocidad_kmh != null ? escapeHtml(String(ev.velocidad_kmh)) + " km/h" : "—"}</dd>
        <dt>Satélites</dt><dd>${escapeHtml(String(ev.satelites ?? 0))}</dd>
        <dt>Fix GPS</dt><dd>${ev.gps_fix ? "Sí" : "No"}</dd>
      </dl>
    `;
    return card;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function openPedidoModal() {
    if (!pedidoModal) return;
    pedidoModal.hidden = false;
    setStatus("", "");
    setPedidoStatus("", "");

    // Prefill para respetar tu regla de N/A cuando no aplique.
    if (selTipoOrigen && selTipoOrigen.value === "casa" && inpNombreEmpresa) {
      inpNombreEmpresa.value = "N/A";
    }
    if (inpNumInterior) inpNumInterior.value = inpNumInterior.value || "N/A";
    if (inpCp && inpCp.value) inpCp.value = inpCp.value.trim();
    if (inpClienteNombre) inpClienteNombre.focus();
  }

  function closePedidoModal() {
    if (!pedidoModal) return;
    pedidoModal.hidden = true;
    setPedidoStatus("", "");
  }

  function clearPedidoForm() {
    if (!pedidoForm) return;
    pedidoForm.reset();
    if (inpNumInterior) inpNumInterior.value = "N/A";
    if (inpNombreEmpresa) inpNombreEmpresa.value = "N/A";
    if (selTipoOrigen) selTipoOrigen.value = "casa";
  }

  function estadoLabel(e) {
    if (e === "recibido") return "Solicitud";
    if (e === "validando") return "En proceso";
    if (e === "convertido_servicio") return "Terminados";
    if (e === "cancelado") return "Cancelado";
    return String(e || "—");
  }

  function renderPedidoCard(p, hayValidando) {
    const card = document.createElement("article");
    const inProceso = p.estado === "validando";
    card.className = "event-card" + (inProceso ? " in-proceso" : "");

    const canMover = p.estado === "recibido" || p.estado === "validando";
    const isRecibido = p.estado === "recibido";
    const primaryLabel = isRecibido ? "En proceso" : "Terminados";
    const primaryDisabled = isRecibido && hayValidando;

    card.innerHTML = `
      <h3>${escapeHtml(estadoLabel(p.estado))}</h3>
      <div class="ts">Registrado: ${escapeHtml(p.created_at)} · ID #${escapeHtml(
        String(p.id)
      )}</div>
      <dl>
        <dt>Cliente</dt><dd>${escapeHtml(p.cliente_nombre ?? "—")}</dd>
        <dt>Teléfono</dt><dd>${escapeHtml(p.telefono_origen)}</dd>
        <dt>Dirección</dt><dd>${escapeHtml(p.direccion_texto)}</dd>
        <dt>Litros</dt><dd>${escapeHtml(String(p.litros_solicitados ?? "—"))}</dd>
        <dt>Estado</dt><dd>${escapeHtml(estadoLabel(p.estado))}</dd>
      </dl>
      ${
        canMover
          ? `<div class="pedido-actions">
               <button type="button" class="btn primary" data-action="avanzar" data-pedido-id="${escapeHtml(
                 String(p.id)
               )}" ${primaryDisabled ? "disabled" : ""}>${escapeHtml(
                 primaryLabel
               )}</button>
               <button type="button" class="btn secondary" data-action="cancelar" data-pedido-id="${escapeHtml(
                 String(p.id)
               )}">Cancelar</button>
             </div>`
          : ""
      }
    `;
    return card;
  }

  async function cargarPedidos() {
    try {
      if (!pedidoStack) return;
      const unidadClave = selUnidad?.value;
      if (!unidadClave) return;

      const data = await fetchJson(
        "/api/consola/pedidos?unidad_clave=" + encodeURIComponent(unidadClave),
        {
        headers: apiHeaders(),
        }
      );
      pedidoStack.innerHTML = "";
      // Mostrar solo los que tienen botones (recibido/validando). Los cancelados los omitimos por ahora.
      const list = (data.pedidos || []).filter(
        (p) => p.estado === "recibido" || p.estado === "validando"
      );
      if (!list.length) {
        pedidoStack.innerHTML =
          '<p class="empty-stack">Aún no hay pedidos guardados.</p>';
        return;
      }

      const hayValidando = list.some((p) => p.estado === "validando");
      for (const p of list) {
        pedidoStack.appendChild(renderPedidoCard(p, hayValidando));
      }
    } catch (e) {
      setStatus(e.message || String(e), "err");
    }
  }

  async function guardarPedido() {
    if (pedidoSaving) return;
    if (!pedidoForm) return;
    if (!inpClienteNombre || !inpTelefonoOrigen || !inpCp || !inpLitrosSolicitados) return;

    const body = {
      unidad_clave: selUnidad?.value,
      cliente_nombre: inpClienteNombre.value,
      telefono_origen: inpTelefonoOrigen.value,
      colonia: inpColonia.value,
      calle: inpCalle.value,
      cp: inpCp.value,
      numero_exterior: inpNumExterior.value,
      numero_interior: inpNumInterior.value,
      tipo_origen: selTipoOrigen.value,
      nombre_empresa: inpNombreEmpresa.value,
      litros_solicitados: inpLitrosSolicitados.value,
    };

    const required = [
      body.unidad_clave,
      body.cliente_nombre,
      body.telefono_origen,
      body.colonia,
      body.calle,
      body.cp,
      body.numero_exterior,
      body.numero_interior,
      body.tipo_origen,
      body.nombre_empresa,
      body.litros_solicitados,
    ];

    if (required.some((v) => v == null || String(v).trim() === "")) {
      setStatus(
        "Completa todos los campos del pedido (usa N/A donde no aplique).",
        "err"
      );
      return;
    }

    pedidoSaving = true;
    if (btnPedidoGuardar) btnPedidoGuardar.disabled = true;
    setStatus("Guardando…", "");
    setPedidoStatus("Guardando…", "");

    try {
      await fetchJson("/api/consola/pedidos", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      setStatus("Pedido guardado correctamente.", "ok");
      setPedidoStatus("", "");
      clearPedidoForm();
      closePedidoModal();
      await cargarPedidos();
    } catch (e) {
      let msg = e.message || String(e);
      if (e.data?.hint) msg += " — " + e.data.hint;
      else if (e.data?.detail) msg += " (" + e.data.detail + ")";
      setStatus(msg, "err");
      setPedidoStatus(msg, "err");
    } finally {
      pedidoSaving = false;
      if (btnPedidoGuardar) btnPedidoGuardar.disabled = false;
    }
  }

  async function cargarEventos() {
    const clave = selUnidad.value;
    if (!clave) return;
    try {
      const data = await fetchJson(
        "/api/consola/eventos?unidad_clave=" +
          encodeURIComponent(clave) +
          "&limit=80",
        { headers: apiHeaders() }
      );
      eventStack.innerHTML = "";
      const list = data.eventos || [];
      if (!list.length) {
        eventStack.innerHTML =
          '<p class="empty-stack">Aún no hay inicios de ruta guardados para esta unidad.</p>';
        return;
      }
      for (const ev of list) {
        eventStack.appendChild(renderEventCard(ev));
      }
    } catch (e) {
      console.warn(e);
    }
  }

  async function guardarInicioRuta() {
    if (saving) return;
    const t = snapshot.telemetria;
    const clave = selUnidad.value;
    if (!clave || !t || snapshot.clave !== clave) {
      setStatus("Espera la próxima lectura (0,5 s) o elige unidad.", "err");
      return;
    }

    saving = true;
    btnInicioRuta.disabled = true;
    setStatus("Guardando…", "");

    const body = {
      unidad_id: clave,
      lat: Number(t.lat),
      lon: Number(t.lon),
      nivel: Number(t.nivel),
      nivel_carburacion:
        t.nivel_carburacion != null ? Number(t.nivel_carburacion) : null,
      nivel_almacen:
        t.nivel_almacen != null ? Number(t.nivel_almacen) : null,
      velocidad_kmh:
        t.velocidad_kmh != null ? Number(t.velocidad_kmh) : 0,
      satelites: 0,
      gps_fix: !(Number(t.lat) === 0 && Number(t.lon) === 0),
    };

    try {
      const data = await fetchJson("/api/consola/inicio-ruta", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      setStatus("Guardado correctamente.", "ok");
      const card = renderEventCard(data.evento);
      const empty = eventStack.querySelector(".empty-stack");
      if (empty) empty.remove();
      eventStack.insertBefore(card, eventStack.firstChild);
    } catch (e) {
      let msg = e.message || String(e);
      if (e.data?.hint) msg += " — " + e.data.hint;
      else if (e.data?.detail) msg += " (" + e.data.detail + ")";
      setStatus(msg, "err");
    } finally {
      saving = false;
      btnInicioRuta.disabled = false;
    }
  }

  btnGuardarKey.addEventListener("click", () => {
    const k = inpApiKey.value.trim();
    if (k) sessionStorage.setItem(STORAGE_KEY, k);
    setStatus("Clave guardada en este navegador.", "ok");
    cargarUnidades();
    cargarEventos();
    if (btnPedido) btnPedido.disabled = false;
    cargarPedidos();
  });

  selUnidad.addEventListener("change", () => {
    iniciarPoll();
    cargarEventos();
    setStatus("", "");
  });

  btnInicioRuta.addEventListener("click", guardarInicioRuta);

  if (selTipoOrigen) {
    selTipoOrigen.addEventListener("change", () => {
      if (selTipoOrigen.value === "casa" && inpNombreEmpresa) {
        inpNombreEmpresa.value = "N/A";
      }
      if (selTipoOrigen.value === "empresa" && inpNombreEmpresa) {
        inpNombreEmpresa.value = "";
      }
    });
  }

  if (btnPedido) {
    btnPedido.addEventListener("click", () => {
      if (btnPedido.disabled) return;
      clearPedidoForm();
      openPedidoModal();
    });
  }

  if (btnPedidoCancelar) {
    btnPedidoCancelar.addEventListener("click", () => {
      clearPedidoForm();
      closePedidoModal();
    });
  }

  // Click en el fondo del overlay o ESC para cerrar (robustez anti-congelamiento).
  if (pedidoModal) {
    pedidoModal.addEventListener("click", (e) => {
      if (e.target === pedidoModal) {
        clearPedidoForm();
        closePedidoModal();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        clearPedidoForm();
        closePedidoModal();
      }
    });
  }

  if (pedidoForm) {
    pedidoForm.addEventListener("submit", (e) => {
      e.preventDefault();
      guardarPedido();
    });
  }

  if (pedidoStack) {
    pedidoStack.addEventListener("click", async (e) => {
      const btn = e.target && e.target.closest
        ? e.target.closest("button[data-action][data-pedido-id]")
        : null;
      if (!btn) return;

      const action = btn.dataset.action;
      const pedidoId = btn.dataset.pedidoId;
      if (!action || !pedidoId) return;
      if (pedidoEstadoSaving) return;

      const unidadClave = selUnidad?.value;
      if (!unidadClave) {
        setStatus("Selecciona una unidad para operar el pedido.", "err");
        return;
      }

      const t = snapshot.telemetria;
      if (!t) {
        setStatus("Sin snapshot de telemetría: espera la lectura.", "err");
        return;
      }

      const nivel_carburacion = t.nivel_carburacion;
      const nivel_almacen = t.nivel_almacen;

      pedidoEstadoSaving = true;
      try {
        setStatus("Actualizando estado…", "");
        if (action === "avanzar") {
          await fetchJson(`/api/consola/pedidos/${encodeURIComponent(pedidoId)}/avanzar`, {
            method: "POST",
            headers: apiHeaders(),
            body: JSON.stringify({
              unidad_clave: unidadClave,
              nivel_carburacion,
              nivel_almacen,
            }),
          });
          setStatus("Estado actualizado.", "ok");
          await cargarPedidos();
          return;
        }

        if (action === "cancelar") {
          const razon = window.prompt(
            "Razón de cancelación (máx 250 caracteres):"
          );
          if (razon == null) return; // canceló el prompt
          const razonTrim = String(razon).trim();
          if (!razonTrim) {
            setStatus("La razón de cancelación es obligatoria.", "err");
            return;
          }
          if (razonTrim.length > 250) {
            setStatus("La razón excede 250 caracteres.", "err");
            return;
          }

          await fetchJson(`/api/consola/pedidos/${encodeURIComponent(pedidoId)}/cancelar`, {
            method: "POST",
            headers: apiHeaders(),
            body: JSON.stringify({
              unidad_clave: unidadClave,
              razon_cancelacion: razonTrim,
              nivel_carburacion,
              nivel_almacen,
            }),
          });
          setStatus("Pedido cancelado.", "ok");
          await cargarPedidos();
          return;
        }
      } catch (e) {
        let msg = e.message || String(e);
        if (e.data?.hint) msg += " — " + e.data.hint;
        else if (e.data?.detail) msg += " (" + e.data.detail + ")";
        setStatus(msg, "err");
      } finally {
        pedidoEstadoSaving = false;
      }
    });
  }

  inpApiKey.value = sessionStorage.getItem(STORAGE_KEY) || "";

  if (inpApiKey.value.trim()) {
    cargarUnidades();
    cargarEventos();
    if (btnPedido) btnPedido.disabled = false;
    cargarPedidos();
  } else {
    setStatus("Introduce la API key y pulsa «Guardar clave».", "");
    eventStack.innerHTML =
      '<p class="empty-stack">Configura la API key para ver el historial.</p>';
  }
})();
