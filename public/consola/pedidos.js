(function () {
  const STORAGE_KEY = "gasuber_consola_api_key";
  const STORAGE_PLANTA_ID = "gasuber_consola_planta_id";
  const STORAGE_PDV_ID = "gasuber_consola_pdv_id";
  const STORAGE_AUTOTANQUE_ID = "gasuber_consola_autotanque_id";

  // Refresco de pedidos (no telemetría): más conservador que 200ms.
  const POLL_MS = 1200;

  const selPlanta = document.getElementById("selPlanta");
  const selPdv = document.getElementById("selPdv");
  const selAutotanque = document.getElementById("selAutotanque");
  const sidebarAutotanqueWrap = document.getElementById("sidebarAutotanqueWrap");

  const autotanqueActivoText = document.getElementById("autotanqueActivoText");
  const inpApiKey = document.getElementById("inpApiKey");
  const btnGuardarKey = document.getElementById("btnGuardarKey");
  const btnPedido = document.getElementById("btnPedido");
  const btnRefrescar = document.getElementById("btnRefrescar");
  const statusMsg = document.getElementById("statusMsg");

  const pedidoStack = document.getElementById("pedidoStack");
  const pedidoActualCard = document.getElementById("pedidoActualCard");

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

  /** @type {Array<{id: string, numero?: string, placas?: string}>} */
  let lastAutotanquesList = [];
  let pedidosCache = [];
  let selectedPedidoId = null;
  let pedidoSaving = false;
  let pedidoEstadoSaving = false;
  let pollTimer = null;

  function setStatus(text, kind) {
    if (!statusMsg) return;
    statusMsg.textContent = text || "";
    statusMsg.className = "status" + (kind ? " " + kind : "");
  }

  function setPedidoStatus(text, kind) {
    if (!pedidoStatusMsg) return;
    pedidoStatusMsg.textContent = text || "";
    pedidoStatusMsg.className = "status" + (kind ? " " + kind : "");
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
    updateAutotanqueActivoLabel();
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
    clearPedidosUI();
  }

  function clearPedidosUI() {
    pedidosCache = [];
    selectedPedidoId = null;
    if (pedidoStack) pedidoStack.innerHTML = '<p class="empty-stack">Seleccione un autotanque.</p>';
    renderPedidoActual(null);
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
      if (e.status !== 401) console.warn("[pedidos] cargarPdv:", e);
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
      if (e.status !== 401) console.warn("[pedidos] cargarPlantas:", e);
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
        clearPedidosUI();
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
      clearPedidosUI();
      if (e.status !== 401) console.warn("[pedidos] cargarAutotanques:", e);
      lastAutotanquesList = [];
    }
  }

  async function syncAutotanqueUI(restoreAutotanque) {
    if (!sidebarAutotanqueWrap || !selAutotanque) return;
    if (!pdvSeleccionadoEsAutotanque()) {
      hideAutotanqueBlock();
      return;
    }
    const plantaId = selPlanta && selPlanta.value;
    if (!plantaId) {
      sidebarAutotanqueWrap.hidden = true;
      stopPolling();
      clearPedidosUI();
      return;
    }
    sidebarAutotanqueWrap.removeAttribute("hidden");
    sidebarAutotanqueWrap.hidden = false;
    await cargarAutotanques(plantaId, restoreAutotanque);
  }

  function estadoLabel(e) {
    if (e === "recibido") return "Solicitud";
    if (e === "validando") return "En proceso";
    if (e === "convertido_servicio") return "Terminados";
    if (e === "cancelado") return "Cancelado";
    return String(e || "—");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatFecha(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return String(ts);
    return d.toLocaleString("es-MX");
  }

  function getPedidoSeleccionado() {
    if (!pedidosCache.length) return null;
    if (selectedPedidoId != null) {
      const found = pedidosCache.find((p) => String(p.id) === String(selectedPedidoId));
      if (found) return found;
    }
    const validando = pedidosCache.find((p) => p.estado === "validando");
    return validando || pedidosCache[0] || null;
  }

  function renderPedidoActual(pedido) {
    if (!pedidoActualCard) return;
    if (!pedido) {
      pedidoActualCard.innerHTML = `
        <p class="pedido-empty-title">Sin pedido activo</p>
        <p class="pedido-empty-sub">Seleccione un pedido para ver detalles.</p>
      `;
      return;
    }
    pedidoActualCard.innerHTML = `
      <dl>
        <dt>ID</dt><dd>#${escapeHtml(String(pedido.id ?? "—"))}</dd>
        <dt>Cliente</dt><dd>${escapeHtml(pedido.cliente_nombre ?? "—")}</dd>
        <dt>Teléfono</dt><dd>${escapeHtml(pedido.telefono_origen ?? "—")}</dd>
        <dt>Dirección</dt><dd>${escapeHtml(pedido.direccion_texto ?? "—")}</dd>
        <dt>Litros</dt><dd>${escapeHtml(String(pedido.litros_solicitados ?? "—"))}</dd>
        <dt>Estado</dt><dd>${escapeHtml(estadoLabel(pedido.estado))}</dd>
        <dt>Fecha</dt><dd>${escapeHtml(formatFecha(pedido.created_at))}</dd>
        <dt>Autotanque</dt><dd>${escapeHtml(autotanqueActivoText?.textContent?.trim() || pedido.autotanque_id || "—")}</dd>
      </dl>
    `;
  }

  function renderPedidoCard(p, hayValidando, isSelected) {
    const card = document.createElement("article");
    const inProceso = p.estado === "validando";
    card.className =
      "event-card" +
      (inProceso ? " in-proceso" : "") +
      (isSelected ? " pedido-selected" : "");
    card.dataset.pedidoId = String(p.id);

    const canMover = p.estado === "recibido" || p.estado === "validando";
    const isRecibido = p.estado === "recibido";
    const primaryLabel = isRecibido ? "En proceso" : "Terminados";
    const primaryDisabled = isRecibido && hayValidando;

    card.innerHTML = `
      <h3>${escapeHtml(estadoLabel(p.estado))}</h3>
      <div class="ts">Registrado: ${escapeHtml(p.created_at)} · ID #${escapeHtml(String(p.id))}</div>
      <dl>
        <dt>Cliente</dt><dd>${escapeHtml(p.cliente_nombre ?? "—")}</dd>
        <dt>Teléfono</dt><dd>${escapeHtml(p.telefono_origen ?? "—")}</dd>
        <dt>Dirección</dt><dd>${escapeHtml(p.direccion_texto ?? "—")}</dd>
        <dt>Litros</dt><dd>${escapeHtml(String(p.litros_solicitados ?? "—"))}</dd>
      </dl>
      ${
        canMover
          ? `<div class="pedido-actions">
               <button type="button" class="btn primary" data-action="avanzar" data-pedido-id="${escapeHtml(String(p.id))}" ${primaryDisabled ? "disabled" : ""}>${escapeHtml(primaryLabel)}</button>
               <button type="button" class="btn secondary" data-action="cancelar" data-pedido-id="${escapeHtml(String(p.id))}">Cancelar</button>
             </div>`
          : ""
      }
    `;
    return card;
  }

  async function cargarPedidos() {
    try {
      if (!pedidoStack) return;
      if (pedidoSaving || pedidoEstadoSaving) return;
      const atq = autotanqueIdConsola();
      if (!atq) return;

      const data = await fetchJson("/api/consola/pedidos?autotanque_id=" + encodeURIComponent(atq), {
        headers: apiHeaders(),
      });

      pedidoStack.innerHTML = "";
      const list = data.pedidos || [];
      pedidosCache = list;
      if (!list.length) {
        selectedPedidoId = null;
        renderPedidoActual(null);
        pedidoStack.innerHTML = '<p class="empty-stack">Aún no hay pedidos guardados.</p>';
        return;
      }

      if (!list.some((p) => String(p.id) === String(selectedPedidoId))) {
        const defaultPedido = list.find((p) => p.estado === "validando") || list[0];
        selectedPedidoId = defaultPedido ? defaultPedido.id : null;
      }

      const hayValidando = list.some((p) => p.estado === "validando");
      for (const p of list) {
        pedidoStack.appendChild(
          renderPedidoCard(p, hayValidando, String(p.id) === String(selectedPedidoId))
        );
      }

      renderPedidoActual(getPedidoSeleccionado());
    } catch (e) {
      setStatus(e.message || String(e), "err");
    }
  }

  function startPollingIfReady() {
    const atq = autotanqueIdConsola();
    if (!atq) {
      stopPolling();
      clearPedidosUI();
      if (btnPedido) btnPedido.disabled = true;
      if (btnRefrescar) btnRefrescar.disabled = true;
      return;
    }

    if (btnPedido) btnPedido.disabled = false;
    if (btnRefrescar) btnRefrescar.disabled = false;

    if (pollTimer) clearInterval(pollTimer);
    void cargarPedidos();
    pollTimer = setInterval(cargarPedidos, POLL_MS);
  }

  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  function openPedidoModal() {
    if (!pedidoModal) return;
    pedidoModal.hidden = false;
    setStatus("", "");
    setPedidoStatus("", "");
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

  async function guardarPedido() {
    if (pedidoSaving) return;
    if (!pedidoForm) return;

    const body = {
      autotanque_id: autotanqueIdConsola(),
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

    if (!body.autotanque_id) {
      setStatus("Seleccione Planta → PDV Autotanque → número antes de crear el pedido.", "err");
      return;
    }

    const required = [
      body.autotanque_id,
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
      setStatus("Completa todos los campos del pedido (usa N/A donde no aplique).", "err");
      setPedidoStatus("Completa todos los campos requeridos.", "err");
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

  async function avanzarPedido(pedidoId) {
    const atq = autotanqueIdConsola();
    if (!atq) return;
    pedidoEstadoSaving = true;
    try {
      setStatus("Actualizando estado…", "");
      await fetchJson(`/api/consola/pedidos/${encodeURIComponent(pedidoId)}/avanzar`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          autotanque_id: atq,
          nivel_carburacion: null,
          nivel_almacen: null,
        }),
      });
      setStatus("Estado actualizado.", "ok");
      await cargarPedidos();
    } catch (e) {
      let msg = e.message || String(e);
      if (e.data?.hint) msg += " — " + e.data.hint;
      else if (e.data?.detail) msg += " (" + e.data.detail + ")";
      setStatus(msg, "err");
    } finally {
      pedidoEstadoSaving = false;
    }
  }

  async function cancelarPedido(pedidoId) {
    const atq = autotanqueIdConsola();
    if (!atq) return;
    const razon = window.prompt("Razón de cancelación (máx 250 caracteres):");
    if (razon == null) return;
    const razonTrim = String(razon).trim();
    if (!razonTrim) {
      setStatus("La razón de cancelación es obligatoria.", "err");
      return;
    }
    if (razonTrim.length > 250) {
      setStatus("La razón excede 250 caracteres.", "err");
      return;
    }
    pedidoEstadoSaving = true;
    try {
      setStatus("Cancelando pedido…", "");
      await fetchJson(`/api/consola/pedidos/${encodeURIComponent(pedidoId)}/cancelar`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          autotanque_id: atq,
          razon_cancelacion: razonTrim,
          nivel_carburacion: null,
          nivel_almacen: null,
        }),
      });
      setStatus("Pedido cancelado.", "ok");
      await cargarPedidos();
    } catch (e) {
      let msg = e.message || String(e);
      if (e.data?.hint) msg += " — " + e.data.hint;
      else if (e.data?.detail) msg += " (" + e.data.detail + ")";
      setStatus(msg, "err");
    } finally {
      pedidoEstadoSaving = false;
    }
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
    if (btnPedido) btnPedido.disabled = true;
    if (btnRefrescar) btnRefrescar.disabled = true;
    clearPedidosUI();
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
    await cargarPlantas();
  }

  // Eventos
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
      startPollingIfReady();
      setStatus("", "");
    });
  }

  if (btnRefrescar) btnRefrescar.addEventListener("click", () => void cargarPedidos());

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
      const card = e.target && e.target.closest ? e.target.closest("article[data-pedido-id]") : null;
      if (card?.dataset?.pedidoId) {
        selectedPedidoId = card.dataset.pedidoId;
        renderPedidoActual(getPedidoSeleccionado());
        for (const n of pedidoStack.querySelectorAll("article[data-pedido-id]")) {
          n.classList.toggle("pedido-selected", String(n.dataset.pedidoId) === String(selectedPedidoId));
        }
      }

      const btn = e.target && e.target.closest
        ? e.target.closest("button[data-action][data-pedido-id]")
        : null;
      if (!btn) return;
      const action = btn.dataset.action;
      const pedidoId = btn.dataset.pedidoId;
      if (!action || !pedidoId) return;
      if (pedidoEstadoSaving) return;

      if (action === "avanzar") return avanzarPedido(pedidoId);
      if (action === "cancelar") return cancelarPedido(pedidoId);
    });
  }

  // init
  if (pedidoModal) pedidoModal.hidden = true;
  renderPedidoActual(null);
  bootstrap();
})();

