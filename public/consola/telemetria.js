(function () {
  const STORAGE_KEY = "gasuber_consola_api_key";
  const STORAGE_PLANTA_ID = "gasuber_consola_planta_id";
  const STORAGE_PDV_ID = "gasuber_consola_pdv_id";
  const STORAGE_ESTACION_ID = "gasuber_consola_estacion_id";
  const STORAGE_ALMACEN_ID = "gasuber_consola_almacen_id";
  const STORAGE_AUTOTANQUE_ID = "gasuber_consola_autotanque_id";
  /** Actualización de telemetría + lista de pedidos cada 200 ms */
  const POLL_MS = 200;

  const autotanqueActivoText = document.getElementById("autotanqueActivoText");
  const selPlanta = document.getElementById("selPlanta");
  const selPdv = document.getElementById("selPdv");
  const selEstacion = document.getElementById("selEstacion");
  const sidebarEstacionWrap = document.getElementById("sidebarEstacionWrap");
  const selAlmacen = document.getElementById("selAlmacen");
  const sidebarAlmacenWrap = document.getElementById("sidebarAlmacenWrap");
  const selAutotanque = document.getElementById("selAutotanque");
  const sidebarAutotanqueWrap = document.getElementById("sidebarAutotanqueWrap");
  const sidebarTripulacionWrap = document.getElementById("sidebarTripulacionWrap");
  const selTripulacionChofer = document.getElementById("selTripulacionChofer");
  const selTripulacionAyudante = document.getElementById("selTripulacionAyudante");
  const tripulacionFecha = document.getElementById("tripulacionFecha");
  const btnGuardarTripulacion = document.getElementById("btnGuardarTripulacion");
  let tripulacionSaving = false;
  const sidebarTarjetaWrap = document.getElementById("sidebarTarjetaWrap");
  const selTarjeta = document.getElementById("selTarjeta");
  const btnGuardarTarjeta = document.getElementById("btnGuardarTarjeta");
  let tarjetaSaving = false;
  /** @type {string} valor guardado en BD para comparar con el desplegable */
  let tarjetaSavedId = "";
  /** @type {Array<{id: string, nombre?: string, tarjeta_id?: string | null, numero?: string}>} */
  let lastEstacionesList = [];
  /** @type {typeof lastEstacionesList} */
  let lastAlmacenesList = [];
  /** @type {typeof lastEstacionesList} */
  let lastAutotanquesList = [];
  /** @type {Array<{id: string, nombre: string}>} */
  let tarjetasCatalog = [];
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
  const pedidoActualCard = document.getElementById("pedidoActualCard");
  const mapHint = document.getElementById("mapHint");
  const mapRuta = document.getElementById("mapRuta");
  const raspberryIndicator = document.getElementById("raspberryIndicator");
  const raspberryText = document.getElementById("raspberryText");
  const raspberryHint = document.getElementById("raspberryHint");

  /** @type {{ telemetria: object | null, clave: string }} */
  let snapshot = { telemetria: null, clave: "" };
  let pollTimer = null;
  let pedidosPollTimer = null;
  let saving = false;
  let pedidoSaving = false;
  let pedidoEstadoSaving = false;
  let pedidosCache = [];
  let selectedPedidoId = null;
  let map = null;
  let unidadMarker = null;
  let clienteMarker = null;
  let mapCenteredOnce = false;

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

  function hideEstacionBlock() {
    if (sidebarEstacionWrap) {
      sidebarEstacionWrap.hidden = true;
      sidebarEstacionWrap.setAttribute("hidden", "");
    }
    if (selEstacion) {
      selEstacion.innerHTML = "";
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "— Elija PDV Estación —";
      selEstacion.appendChild(o);
      selEstacion.disabled = true;
    }
    sessionStorage.removeItem(STORAGE_ESTACION_ID);
  }

  function hideAlmacenBlock() {
    if (sidebarAlmacenWrap) {
      sidebarAlmacenWrap.hidden = true;
      sidebarAlmacenWrap.setAttribute("hidden", "");
    }
    if (selAlmacen) {
      selAlmacen.innerHTML = "";
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "— Elija PDV Almacén —";
      selAlmacen.appendChild(o);
      selAlmacen.disabled = true;
    }
    sessionStorage.removeItem(STORAGE_ALMACEN_ID);
  }

  function hideTripulacionPanel() {
    if (sidebarTripulacionWrap) {
      sidebarTripulacionWrap.hidden = true;
      sidebarTripulacionWrap.setAttribute("hidden", "");
    }
    if (selTripulacionChofer) {
      selTripulacionChofer.innerHTML = "";
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "— Elija autotanque primero —";
      selTripulacionChofer.appendChild(o);
      selTripulacionChofer.disabled = true;
    }
    if (selTripulacionAyudante) {
      selTripulacionAyudante.innerHTML = "";
      const o2 = document.createElement("option");
      o2.value = "";
      o2.textContent = "— Elija autotanque primero —";
      selTripulacionAyudante.appendChild(o2);
      selTripulacionAyudante.disabled = true;
    }
    if (tripulacionFecha) tripulacionFecha.textContent = "";
    if (btnGuardarTripulacion) btnGuardarTripulacion.disabled = true;
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
    hideTripulacionPanel();
    updateAutotanqueActivoLabel();
  }

  function hideTarjetaPanel() {
    if (sidebarTarjetaWrap) {
      sidebarTarjetaWrap.hidden = true;
      sidebarTarjetaWrap.setAttribute("hidden", "");
    }
    if (selTarjeta) {
      selTarjeta.innerHTML = "";
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "— —";
      selTarjeta.appendChild(o);
      selTarjeta.disabled = true;
    }
    tarjetaSavedId = "";
    if (btnGuardarTarjeta) btnGuardarTarjeta.disabled = true;
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
    hideEstacionBlock();
    hideAlmacenBlock();
    hideAutotanqueBlock();
    hideTarjetaPanel();
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

  function pdvSeleccionadoEsEstacion() {
    if (!selPdv || selPdv.disabled) return false;
    const idx = selPdv.selectedIndex;
    if (idx < 0) return false;
    const opt = selPdv.options[idx];
    if (!opt) return false;
    if (!String(opt.value ?? "").trim()) return false;
    const meta = (opt.getAttribute("data-pdv-nombre") || "").trim();
    const label = (opt.textContent || "").replace(/\s+/g, " ").trim();
    return normalizarNombrePdv(meta || label) === "ESTACION";
  }

  function pdvSeleccionadoEsAlmacen() {
    if (!selPdv || selPdv.disabled) return false;
    const idx = selPdv.selectedIndex;
    if (idx < 0) return false;
    const opt = selPdv.options[idx];
    if (!opt) return false;
    if (!String(opt.value ?? "").trim()) return false;
    const meta = (opt.getAttribute("data-pdv-nombre") || "").trim();
    const label = (opt.textContent || "").replace(/\s+/g, " ").trim();
    return normalizarNombrePdv(meta || label) === "ALMACEN";
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

  /** Id de ID-PDV-AUTOTANQUE para telemetría, pedidos e inicio de ruta (solo si PDV = Autotanque). */
  function autotanqueIdConsola() {
    if (
      !pdvSeleccionadoEsAutotanque() ||
      !selAutotanque ||
      !selAutotanque.value ||
      selAutotanque.disabled
    ) {
      return "";
    }
    return String(selAutotanque.value);
  }

  function updateAutotanqueActivoLabel() {
    if (!autotanqueActivoText) return;
    const id = autotanqueIdConsola();
    if (!id) {
      autotanqueActivoText.textContent =
        "— Elija Planta → PDV Autotanque → número (telemetría y pedidos por ID-PDV-AUTOTANQUE) —";
      return;
    }
    const row = lastAutotanquesList.find((x) => String(x.id) === String(id));
    if (row) {
      const t = row.tarjeta_nombre
        ? ` · ${row.tarjeta_nombre}`
        : " · sin tarjeta RPI (no habrá telemetría)";
      autotanqueActivoText.textContent = `${row.numero} — ${row.placas}${t}`;
    } else {
      autotanqueActivoText.textContent = `Autotanque id ${id}`;
    }
  }

  function plantaPdvContextLine() {
    if (!selPlanta || !selPdv) return "";
    const plOpt = selPlanta.options[selPlanta.selectedIndex];
    const pvOpt = selPdv.options[selPdv.selectedIndex];
    const pn = selPlanta.value && plOpt ? plOpt.textContent.trim() : "";
    const dn = selPdv.value && pvOpt && !selPdv.disabled ? pvOpt.textContent.trim() : "";
    let es = "";
    if (
      sidebarEstacionWrap &&
      !sidebarEstacionWrap.hidden &&
      selEstacion &&
      selEstacion.value &&
      !selEstacion.disabled
    ) {
      const eo = selEstacion.options[selEstacion.selectedIndex];
      if (eo) es = ` · Estación: ${eo.textContent.trim()}`;
    }
    let al = "";
    if (
      sidebarAlmacenWrap &&
      !sidebarAlmacenWrap.hidden &&
      selAlmacen &&
      selAlmacen.value &&
      !selAlmacen.disabled
    ) {
      const ao = selAlmacen.options[selAlmacen.selectedIndex];
      if (ao) al = ` · Almacén: ${ao.textContent.trim()}`;
    }
    let at = "";
    if (
      sidebarAutotanqueWrap &&
      !sidebarAutotanqueWrap.hidden &&
      selAutotanque &&
      selAutotanque.value &&
      !selAutotanque.disabled
    ) {
      const ax = selAutotanque.options[selAutotanque.selectedIndex];
      if (ax) at = ` · Autotanque: ${ax.textContent.trim()}`;
    }
    const extra = `${es}${al}${at}`;
    if (!pn && !dn && !extra) return "";
    if (pn && dn) return ` · Planta: ${pn} · PDV: ${dn}${extra}`;
    if (pn) return ` · Planta: ${pn}${extra}`;
    if (dn) return ` · PDV: ${dn}${extra}`;
    return extra;
  }

  async function cargarEstaciones(plantaId, restoreEstacion) {
    if (!selEstacion || !sidebarEstacionWrap) return;
    if (!restoreEstacion) sessionStorage.removeItem(STORAGE_ESTACION_ID);
    try {
      const data = await fetchJson(
        "/api/consola/pdv-estacion?planta_id=" + encodeURIComponent(plantaId),
        { headers: apiHeaders() }
      );
      selEstacion.innerHTML = "";
      const list = data.estaciones || [];
      lastEstacionesList = list;
      if (!list.length) {
        const o = document.createElement("option");
        o.value = "";
        o.textContent = "Sin estaciones en BD";
        selEstacion.appendChild(o);
        selEstacion.disabled = true;
        sessionStorage.removeItem(STORAGE_ESTACION_ID);
        return;
      }
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "— Seleccione estación —";
      selEstacion.appendChild(empty);
      for (const row of list) {
        const opt = document.createElement("option");
        opt.value = row.id;
        opt.textContent = row.nombre;
        selEstacion.appendChild(opt);
      }
      selEstacion.disabled = false;
      if (restoreEstacion) {
        const saved = sessionStorage.getItem(STORAGE_ESTACION_ID);
        if (saved && list.some((x) => String(x.id) === String(saved))) {
          selEstacion.value = saved;
        } else {
          sessionStorage.removeItem(STORAGE_ESTACION_ID);
        }
      }
    } catch (e) {
      selEstacion.innerHTML = "";
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "Error cargando estaciones";
      selEstacion.appendChild(o);
      selEstacion.disabled = true;
      sessionStorage.removeItem(STORAGE_ESTACION_ID);
      if (e.status !== 401) console.warn("[consola] cargarEstaciones:", e);
      lastEstacionesList = [];
    }
  }

  async function syncEstacionUI(restoreEstacion) {
    if (!sidebarEstacionWrap || !selEstacion) return;
    if (!pdvSeleccionadoEsEstacion()) {
      hideEstacionBlock();
      return;
    }
    const plantaId = selPlanta && selPlanta.value;
    if (!plantaId) {
      sidebarEstacionWrap.hidden = true;
      return;
    }
    sidebarEstacionWrap.removeAttribute("hidden");
    sidebarEstacionWrap.hidden = false;
    await cargarEstaciones(plantaId, restoreEstacion);
  }

  async function cargarAlmacenes(plantaId, restoreAlmacen) {
    if (!selAlmacen || !sidebarAlmacenWrap) return;
    if (!restoreAlmacen) sessionStorage.removeItem(STORAGE_ALMACEN_ID);
    try {
      const data = await fetchJson(
        "/api/consola/pdv-almacen?planta_id=" + encodeURIComponent(plantaId),
        { headers: apiHeaders() }
      );
      selAlmacen.innerHTML = "";
      const list = data.almacenes || [];
      lastAlmacenesList = list;
      if (!list.length) {
        const o = document.createElement("option");
        o.value = "";
        o.textContent = "Sin almacenes en BD";
        selAlmacen.appendChild(o);
        selAlmacen.disabled = true;
        sessionStorage.removeItem(STORAGE_ALMACEN_ID);
        return;
      }
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "— Seleccione almacén —";
      selAlmacen.appendChild(empty);
      for (const row of list) {
        const opt = document.createElement("option");
        opt.value = row.id;
        opt.textContent = row.nombre;
        selAlmacen.appendChild(opt);
      }
      selAlmacen.disabled = false;
      if (restoreAlmacen) {
        const saved = sessionStorage.getItem(STORAGE_ALMACEN_ID);
        if (saved && list.some((x) => String(x.id) === String(saved))) {
          selAlmacen.value = saved;
        } else {
          sessionStorage.removeItem(STORAGE_ALMACEN_ID);
        }
      }
    } catch (e) {
      selAlmacen.innerHTML = "";
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "Error cargando almacenes";
      selAlmacen.appendChild(o);
      selAlmacen.disabled = true;
      sessionStorage.removeItem(STORAGE_ALMACEN_ID);
      if (e.status !== 401) console.warn("[consola] cargarAlmacenes:", e);
      lastAlmacenesList = [];
    }
  }

  async function syncAlmacenUI(restoreAlmacen) {
    if (!sidebarAlmacenWrap || !selAlmacen) return;
    if (!pdvSeleccionadoEsAlmacen()) {
      hideAlmacenBlock();
      return;
    }
    const plantaId = selPlanta && selPlanta.value;
    if (!plantaId) {
      sidebarAlmacenWrap.hidden = true;
      return;
    }
    sidebarAlmacenWrap.removeAttribute("hidden");
    sidebarAlmacenWrap.hidden = false;
    await cargarAlmacenes(plantaId, restoreAlmacen);
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
    } catch (e) {
      selAutotanque.innerHTML = "";
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "Error cargando autotanques";
      selAutotanque.appendChild(o);
      selAutotanque.disabled = true;
      sessionStorage.removeItem(STORAGE_AUTOTANQUE_ID);
      if (e.status !== 401) console.warn("[consola] cargarAutotanques:", e);
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
      return;
    }
    sidebarAutotanqueWrap.removeAttribute("hidden");
    sidebarAutotanqueWrap.hidden = false;
    await cargarAutotanques(plantaId, restoreAutotanque);
    await refreshTripulacionPanel();
    updateAutotanqueActivoLabel();
  }

  function updateTripulacionGuardarBtn() {
    if (!btnGuardarTripulacion) return;
    const ok =
      selTripulacionChofer &&
      selTripulacionAyudante &&
      selTripulacionChofer.value &&
      selTripulacionAyudante.value &&
      pdvSeleccionadoEsAutotanque() &&
      selAutotanque &&
      selAutotanque.value;
    btnGuardarTripulacion.disabled = !ok || tripulacionSaving;
  }

  async function refreshTripulacionPanel() {
    if (!sidebarTripulacionWrap || !selTripulacionChofer || !selTripulacionAyudante) {
      return;
    }
    if (!pdvSeleccionadoEsAutotanque() || !selAutotanque || !selAutotanque.value) {
      hideTripulacionPanel();
      return;
    }
    const plantaId = selPlanta && selPlanta.value;
    const atqId = selAutotanque.value;
    if (!plantaId) {
      hideTripulacionPanel();
      return;
    }
    sidebarTripulacionWrap.removeAttribute("hidden");
    sidebarTripulacionWrap.hidden = false;
    try {
      const baseQ =
        "planta_id=" +
        encodeURIComponent(plantaId) +
        "&autotanque_id=" +
        encodeURIComponent(atqId);
      const [dataCh, dataAy, dataAsig] = await Promise.all([
        fetchJson("/api/consola/tripulacion/empleados?puesto=CHOFER&" + baseQ, {
          headers: apiHeaders(),
        }),
        fetchJson("/api/consola/tripulacion/empleados?puesto=AYUDANTE&" + baseQ, {
          headers: apiHeaders(),
        }),
        fetchJson(
          "/api/consola/tripulacion/asignacion?autotanque_id=" +
            encodeURIComponent(atqId),
          { headers: apiHeaders() }
        ),
      ]);

      const fillSel = (sel, list, emptyLabel) => {
        sel.innerHTML = "";
        const em = document.createElement("option");
        em.value = "";
        em.textContent = emptyLabel;
        sel.appendChild(em);
        for (const row of list) {
          const opt = document.createElement("option");
          opt.value = row.id;
          opt.textContent = row.nombre_empleado;
          sel.appendChild(opt);
        }
        sel.disabled = false;
      };

      fillSel(
        selTripulacionChofer,
        dataCh.empleados || [],
        "— Seleccione chofer —"
      );
      fillSel(
        selTripulacionAyudante,
        dataAy.empleados || [],
        "— Seleccione ayudante —"
      );

      const asig = dataAsig.asignacion;
      const ensureOpt = (sel, id, label) => {
        if (!id || !label) return;
        const exists = Array.from(sel.options).some((o) => o.value === String(id));
        if (!exists) {
          const opt = document.createElement("option");
          opt.value = String(id);
          opt.textContent = label;
          sel.appendChild(opt);
        }
      };
      if (asig && asig.chofer) {
        ensureOpt(
          selTripulacionChofer,
          asig.chofer.empleado_id,
          asig.chofer.nombre_empleado
        );
      }
      if (asig && asig.ayudante) {
        ensureOpt(
          selTripulacionAyudante,
          asig.ayudante.empleado_id,
          asig.ayudante.nombre_empleado
        );
      }
      if (asig?.chofer?.empleado_id) {
        selTripulacionChofer.value = asig.chofer.empleado_id;
      }
      if (asig?.ayudante?.empleado_id) {
        selTripulacionAyudante.value = asig.ayudante.empleado_id;
      }
      const fe =
        (asig && asig.chofer && asig.chofer.fecha_asignacion) ||
        (asig && asig.ayudante && asig.ayudante.fecha_asignacion) ||
        "";
      if (tripulacionFecha) {
        tripulacionFecha.textContent = fe
          ? "Última asignación: " +
            new Date(fe).toLocaleString("es-MX", {
              dateStyle: "short",
              timeStyle: "short",
            })
          : "Sin asignación guardada.";
      }
      updateTripulacionGuardarBtn();
    } catch (e) {
      hideTripulacionPanel();
      if (e.status !== 401) console.warn("[consola] refreshTripulacionPanel:", e);
    }
  }

  async function guardarTripulacion() {
    if (
      tripulacionSaving ||
      !selAutotanque ||
      !selTripulacionChofer ||
      !selTripulacionAyudante
    ) {
      return;
    }
    const atq = selAutotanque.value;
    const ch = selTripulacionChofer.value;
    const ay = selTripulacionAyudante.value;
    if (!atq || !ch || !ay) {
      setStatus("Seleccione chofer y ayudante.", "err");
      return;
    }
    tripulacionSaving = true;
    updateTripulacionGuardarBtn();
    setStatus("Guardando tripulación…", "");
    try {
      await fetchJson("/api/consola/tripulacion/asignacion", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          autotanque_id: atq,
          chofer_empleado_id: ch,
          ayudante_empleado_id: ay,
        }),
      });
      setStatus("Tripulación guardada.", "ok");
      await refreshTripulacionPanel();
    } catch (e) {
      let msg = e.message || String(e);
      if (e.data && e.data.error) msg = e.data.error;
      setStatus(msg, "err");
    } finally {
      tripulacionSaving = false;
      updateTripulacionGuardarBtn();
    }
  }

  async function ensureTarjetasCatalog() {
    if (tarjetasCatalog.length) return;
    const data = await fetchJson("/api/consola/tarjetas", {
      headers: apiHeaders(),
    });
    tarjetasCatalog = data.tarjetas || [];
  }

  function buildTarjetaSelectOptions() {
    if (!selTarjeta) return;
    selTarjeta.innerHTML = "";
    const em = document.createElement("option");
    em.value = "";
    em.textContent = "— Sin asignar —";
    selTarjeta.appendChild(em);
    for (const t of tarjetasCatalog) {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.nombre;
      selTarjeta.appendChild(opt);
    }
  }

  function updateTarjetaGuardarBtn() {
    if (!btnGuardarTarjeta || !selTarjeta) return;
    // Siempre habilitado con panel visible (salvo durante guardado): antes exigía "cambio"
    // respecto a BD y bloqueaba el botón si ya estaba RPI-001, confundiendo al usuario.
    btnGuardarTarjeta.disabled = tarjetaSaving;
  }

  async function refreshTarjetaPanel() {
    if (!sidebarTarjetaWrap || !selTarjeta) return;

    let tipo = null;
    let activoId = "";
    let currentTarjetaId = "";

    if (
      pdvSeleccionadoEsEstacion() &&
      selEstacion &&
      selEstacion.value &&
      !selEstacion.disabled
    ) {
      tipo = "estacion";
      activoId = selEstacion.value;
      const row = lastEstacionesList.find((x) => String(x.id) === String(activoId));
      currentTarjetaId = row && row.tarjeta_id != null ? String(row.tarjeta_id) : "";
    } else if (
      pdvSeleccionadoEsAlmacen() &&
      selAlmacen &&
      selAlmacen.value &&
      !selAlmacen.disabled
    ) {
      tipo = "almacen";
      activoId = selAlmacen.value;
      const row = lastAlmacenesList.find((x) => String(x.id) === String(activoId));
      currentTarjetaId = row && row.tarjeta_id != null ? String(row.tarjeta_id) : "";
    } else if (
      pdvSeleccionadoEsAutotanque() &&
      selAutotanque &&
      selAutotanque.value &&
      !selAutotanque.disabled
    ) {
      tipo = "autotanque";
      activoId = selAutotanque.value;
      const row = lastAutotanquesList.find((x) => String(x.id) === String(activoId));
      currentTarjetaId = row && row.tarjeta_id != null ? String(row.tarjeta_id) : "";
    }

    if (!tipo || !activoId) {
      hideTarjetaPanel();
      return;
    }

    try {
      await ensureTarjetasCatalog();
    } catch (e) {
      hideTarjetaPanel();
      if (e.status !== 401) console.warn("[consola] ensureTarjetasCatalog:", e);
      return;
    }

    if (!tarjetasCatalog.length) {
      hideTarjetaPanel();
      return;
    }

    sidebarTarjetaWrap.removeAttribute("hidden");
    sidebarTarjetaWrap.hidden = false;
    buildTarjetaSelectOptions();
    tarjetaSavedId = currentTarjetaId;
    selTarjeta.value = currentTarjetaId;
    selTarjeta.disabled = false;
    updateTarjetaGuardarBtn();
  }

  async function guardarTarjeta() {
    if (tarjetaSaving || !selTarjeta) return;
    let tipo = null;
    if (
      pdvSeleccionadoEsEstacion() &&
      selEstacion &&
      selEstacion.value &&
      !selEstacion.disabled
    ) {
      tipo = "estacion";
    } else if (
      pdvSeleccionadoEsAlmacen() &&
      selAlmacen &&
      selAlmacen.value &&
      !selAlmacen.disabled
    ) {
      tipo = "almacen";
    } else if (
      pdvSeleccionadoEsAutotanque() &&
      selAutotanque &&
      selAutotanque.value &&
      !selAutotanque.disabled
    ) {
      tipo = "autotanque";
    }
    if (!tipo) return;

    const activo_id =
      tipo === "estacion"
        ? selEstacion.value
        : tipo === "almacen"
          ? selAlmacen.value
          : selAutotanque.value;

    tarjetaSaving = true;
    updateTarjetaGuardarBtn();
    setStatus("Guardando tarjeta…", "");
    const plantaId = selPlanta && selPlanta.value;
    try {
      await fetchJson("/api/consola/activo-tarjeta", {
        method: "PATCH",
        headers: apiHeaders(),
        body: JSON.stringify({
          tipo,
          activo_id,
          tarjeta_id: selTarjeta.value || "",
        }),
      });
      setStatus("Tarjeta guardada.", "ok");
      tarjetaSavedId = String(selTarjeta.value || "");
      if (plantaId) {
        if (tipo === "estacion") await cargarEstaciones(plantaId, true);
        else if (tipo === "almacen") await cargarAlmacenes(plantaId, true);
        else await cargarAutotanques(plantaId, true);
        if (tipo === "autotanque") await refreshTripulacionPanel();
      }
      await refreshTarjetaPanel();
    } catch (e) {
      let msg = e.message || String(e);
      if (e.data && e.data.error) msg = e.data.error;
      setStatus(msg, "err");
    } finally {
      tarjetaSaving = false;
      updateTarjetaGuardarBtn();
    }
  }

  async function syncPdvDetalleUI(restore) {
    await syncEstacionUI(pdvSeleccionadoEsEstacion() ? restore : false);
    await syncAlmacenUI(pdvSeleccionadoEsAlmacen() ? restore : false);
    await syncAutotanqueUI(pdvSeleccionadoEsAutotanque() ? restore : false);
    await refreshTarjetaPanel();
    if (btnInicioRuta) btnInicioRuta.disabled = !autotanqueIdConsola();
  }

  async function cargarPdv(plantaId, restorePdv) {
    if (!selPdv) return;
    if (!plantaId) {
      resetPdvSelect();
      return;
    }
    try {
      const data = await fetchJson(
        "/api/consola/pdv?planta_id=" + encodeURIComponent(plantaId),
        { headers: apiHeaders() }
      );
      selPdv.innerHTML = "";
      const pdvs = data.pdvs || [];
      if (!pdvs.length) {
        const o = document.createElement("option");
        o.value = "";
        o.textContent = "Sin PDV para esta planta";
        selPdv.appendChild(o);
        selPdv.disabled = true;
        sessionStorage.removeItem(STORAGE_PDV_ID);
        hideEstacionBlock();
        hideAlmacenBlock();
        hideAutotanqueBlock();
        hideTarjetaPanel();
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
      await syncPdvDetalleUI(restorePdv);
    } catch (e) {
      selPdv.innerHTML = "";
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "Error cargando PDV";
      selPdv.appendChild(o);
      selPdv.disabled = true;
      sessionStorage.removeItem(STORAGE_PDV_ID);
      hideEstacionBlock();
      hideAlmacenBlock();
      hideAutotanqueBlock();
      hideTarjetaPanel();
      if (e.status !== 401) console.warn("[consola] cargarPdv:", e);
    }
  }

  async function cargarPlantas() {
    if (!selPlanta || !selPdv) return;
    try {
      const data = await fetchJson("/api/consola/plantas", {
        headers: apiHeaders(),
      });
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
      if (
        savedPlanta &&
        plantas.some((x) => String(x.id) === String(savedPlanta))
      ) {
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
        e.status === 401
          ? "API key no válida"
          : hint
            ? "Falta crear tablas (ver aviso abajo)"
            : "Error cargando plantas";
      selPlanta.appendChild(o);
      resetPdvSelect();
      if (hint || apiErr) {
        setStatus([apiErr, hint].filter(Boolean).join(" — "), "err");
      } else if (e.status !== 401) {
        setStatus(e.message || "Error cargando plantas", "err");
      }
      if (e.status !== 401) console.warn("[consola] cargarPlantas:", e);
    }
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

  function hasValidCoords(lat, lon) {
    const nLat = Number(lat);
    const nLon = Number(lon);
    if (!Number.isFinite(nLat) || !Number.isFinite(nLon)) return false;
    return !(nLat === 0 && nLon === 0);
  }

  function getPedidoCoords(pedido) {
    if (!pedido || typeof pedido !== "object") return null;
    const latRaw =
      pedido.cliente_lat ??
      pedido.clienteLat ??
      pedido.lat_cliente ??
      pedido.latCliente ??
      pedido.lat;
    const lonRaw =
      pedido.cliente_lon ??
      pedido.clienteLng ??
      pedido.cliente_lng ??
      pedido.lon_cliente ??
      pedido.lng_cliente ??
      pedido.lon ??
      pedido.lng;
    if (!hasValidCoords(latRaw, lonRaw)) return null;
    return { lat: Number(latRaw), lon: Number(lonRaw) };
  }

  function ensureMap() {
    if (map || !mapRuta || !window.L) return;
    map = L.map(mapRuta, {
      zoomControl: true,
      attributionControl: true,
    }).setView([19.043, -98.198], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
  }

  function updateMapUnidad(t) {
    ensureMap();
    if (!map) return;
    if (!t || !hasValidCoords(t.lat, t.lon)) {
      if (mapHint) mapHint.textContent = "Sin fix GPS: la unidad reporta coordenadas 0,0.";
      return;
    }
    const lat = Number(t.lat);
    const lon = Number(t.lon);
    const nextLatLng = [lat, lon];
    if (!unidadMarker) {
      unidadMarker = L.marker(nextLatLng, { title: "Unidad / pipa" }).addTo(map);
      unidadMarker.bindPopup("Unidad / pipa");
    } else {
      unidadMarker.setLatLng(nextLatLng);
    }
    if (!mapCenteredOnce) {
      map.setView(nextLatLng, 15, { animate: false });
      mapCenteredOnce = true;
    } else {
      map.panTo(nextLatLng, { animate: false });
    }
    if (mapHint) mapHint.textContent = "Ubicación actual de la unidad actualizada en vivo.";
  }

  function updateMapCliente(pedido) {
    ensureMap();
    if (!map) return;
    const coords = getPedidoCoords(pedido);
    if (!coords) {
      if (clienteMarker) {
        map.removeLayer(clienteMarker);
        clienteMarker = null;
      }
      return;
    }
    const point = [coords.lat, coords.lon];
    const popup = pedido?.cliente_nombre
      ? `Cliente: ${escapeHtml(pedido.cliente_nombre)}`
      : "Ubicación cliente";
    if (!clienteMarker) {
      clienteMarker = L.marker(point, { title: "Cliente" }).addTo(map);
    } else {
      clienteMarker.setLatLng(point);
    }
    clienteMarker.bindPopup(popup);
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
      updateMapCliente(null);
      return;
    }
    const coords = getPedidoCoords(pedido);
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
        <dt>Coord. cliente</dt><dd>${
          coords
            ? `${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`
            : "No disponibles"
        }</dd>
      </dl>
    `;
    updateMapCliente(pedido);
  }

  function setRaspberryIndicator(r) {
    if (!raspberryIndicator || !raspberryText) return;
    raspberryIndicator.classList.remove("ok", "warn", "bad");
    if (raspberryHint) {
      raspberryHint.hidden = true;
      raspberryHint.textContent = "";
    }
    if (r && r.sin_tarjeta_asignada) {
      raspberryIndicator.classList.add("bad");
      raspberryText.textContent = "Raspberry: sin tarjeta en autotanque";
      if (raspberryHint) {
        raspberryHint.hidden = false;
        raspberryHint.textContent =
          "Asigne una tarjeta RPI-001…040 a este autotanque en la barra lateral (ID tarjeta). Sin tarjeta no se aceptan envíos GPS.";
      }
      return;
    }
    if (!r || r.sin_fila_gps) {
      raspberryIndicator.classList.add("bad");
      raspberryText.textContent = "Raspberry: sin datos en servidor";
      if (raspberryHint) {
        raspberryHint.hidden = false;
        raspberryHint.textContent =
          "La Pi debe enviar POST /api/gps con header x-api-key (API_KEY_RASPBERRY) y autotanque_id igual al id del autotanque (misma consola). Prueba GET /api/gps/health para verificar la URL del backend.";
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
        "El último envío a la base de datos es anterior al umbral. Comprueba red, API_KEY_RASPBERRY y que autotanque_id en la Pi coincida con el autotanque seleccionado.";
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
      await cargarPlantas();
      if (inpApiKey.value.trim()) {
        btnInicioRuta.disabled = !autotanqueIdConsola();
        iniciarPoll();
      }
    } catch (e) {
      setStatus(e.message || String(e), "err");
    }
  }

  async function pollTelemetria() {
    const atq = autotanqueIdConsola();
    if (!atq) {
      snapshot = { telemetria: null, clave: "" };
      if (gCarb) gCarb.textContent = "—";
      if (gAlm) gAlm.textContent = "—";
      if (gVel) gVel.textContent = "—";
      if (metaLine) {
        metaLine.textContent =
          "Seleccione Planta → PDV Autotanque → número. La telemetría viene de la Raspberry asignada por tarjeta a ese registro.";
      }
      setRaspberryIndicator(null);
      if (mapHint) mapHint.textContent = "Seleccione un autotanque en la barra lateral.";
      return;
    }
    try {
      const data = await fetchJson(
        "/api/consola/telemetria-autotanque/" + encodeURIComponent(atq),
        { headers: apiHeaders() }
      );

      if (data.sin_tarjeta_asignada) {
        snapshot = { telemetria: null, clave: atq };
        if (gCarb) gCarb.textContent = "—";
        if (gAlm) gAlm.textContent = "—";
        if (gVel) gVel.textContent = "—";
        if (metaLine) {
          metaLine.textContent =
            "Sin tarjeta RPI en este autotanque: asigne RPI-001… en «ID tarjeta» o no habrá datos." +
            plantaPdvContextLine();
        }
        setRaspberryIndicator(data.raspberry);
        if (mapHint) mapHint.textContent = "Sin telemetría hasta asignar tarjeta Raspberry.";
        return;
      }

      const t = data.telemetria;
      snapshot = { telemetria: t, clave: atq };

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
      metaLine.textContent = `GPS: ${lat}°, ${lon}°${fixTxt} · nivel (compat): ${fmtPct(t.nivel)}% · placas: ${t.placa}${t.fecha ? " · último dato GPS: " + t.fecha : ""}${plantaPdvContextLine()}`;
      updateMapUnidad(t);
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
    if (pedidosPollTimer) clearInterval(pedidosPollTimer);
    pollTelemetria();
    cargarPedidos();
    pollTimer = setInterval(pollTelemetria, POLL_MS);
    pedidosPollTimer = setInterval(cargarPedidos, POLL_MS);
  }

  function renderEventCard(ev) {
    const card = document.createElement("article");
    card.className = "event-card";
    card.innerHTML = `
      <h3>Inicio de ruta</h3>
      <div class="ts">Registrado: ${escapeHtml(ev.created_at)} · ID #${escapeHtml(String(ev.id))}</div>
      <dl>
        <dt>Autotanque</dt><dd>${escapeHtml(ev.unidad_clave || "—")}</dd>
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
      if (pedidoSaving || pedidoEstadoSaving) return;
      const atq = autotanqueIdConsola();
      if (!atq) return;

      const data = await fetchJson(
        "/api/consola/pedidos?autotanque_id=" + encodeURIComponent(atq),
        {
        headers: apiHeaders(),
        }
      );
      pedidoStack.innerHTML = "";
      // Mostrar solo los que tienen botones (recibido/validando). Los cancelados los omitimos por ahora.
      const list = (data.pedidos || []).filter(
        (p) => p.estado === "recibido" || p.estado === "validando"
      );
      pedidosCache = list;
      if (!list.length) {
        selectedPedidoId = null;
        renderPedidoActual(null);
        pedidoStack.innerHTML =
          '<p class="empty-stack">Aún no hay pedidos guardados.</p>';
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

  async function guardarPedido() {
    if (pedidoSaving) return;
    if (!pedidoForm) return;
    if (!inpClienteNombre || !inpTelefonoOrigen || !inpCp || !inpLitrosSolicitados) return;

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
    const atq = autotanqueIdConsola();
    if (!atq) return;
    try {
      const data = await fetchJson(
        "/api/consola/eventos?autotanque_id=" +
          encodeURIComponent(atq) +
          "&limit=80",
        { headers: apiHeaders() }
      );
      eventStack.innerHTML = "";
      const list = data.eventos || [];
      if (!list.length) {
        eventStack.innerHTML =
          '<p class="empty-stack">Aún no hay inicios de ruta guardados para este autotanque.</p>';
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
    const atq = autotanqueIdConsola();
    if (!atq || !t || String(snapshot.clave) !== String(atq)) {
      setStatus(
        "Espera telemetría (0,2 s) con PDV Autotanque y número elegidos, y tarjeta RPI asignada.",
        "err"
      );
      return;
    }

    saving = true;
    btnInicioRuta.disabled = true;
    setStatus("Guardando…", "");

    const body = {
      autotanque_id: atq,
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
    let pdvEstacionRaf = 0;
    const onPdvElegido = () => {
      if (selPdv.value) sessionStorage.setItem(STORAGE_PDV_ID, selPdv.value);
      else sessionStorage.removeItem(STORAGE_PDV_ID);
      if (pdvEstacionRaf) cancelAnimationFrame(pdvEstacionRaf);
      pdvEstacionRaf = requestAnimationFrame(() => {
        pdvEstacionRaf = 0;
        void syncPdvDetalleUI(true);
      });
    };
    selPdv.addEventListener("change", onPdvElegido);
    selPdv.addEventListener("input", onPdvElegido);
  }

  if (selEstacion) {
    selEstacion.addEventListener("change", () => {
      if (selEstacion.value) {
        sessionStorage.setItem(STORAGE_ESTACION_ID, selEstacion.value);
      } else {
        sessionStorage.removeItem(STORAGE_ESTACION_ID);
      }
      void refreshTarjetaPanel();
    });
  }

  if (selAlmacen) {
    selAlmacen.addEventListener("change", () => {
      if (selAlmacen.value) {
        sessionStorage.setItem(STORAGE_ALMACEN_ID, selAlmacen.value);
      } else {
        sessionStorage.removeItem(STORAGE_ALMACEN_ID);
      }
      void refreshTarjetaPanel();
    });
  }

  if (selAutotanque) {
    selAutotanque.addEventListener("change", () => {
      if (selAutotanque.value) {
        sessionStorage.setItem(STORAGE_AUTOTANQUE_ID, selAutotanque.value);
      } else {
        sessionStorage.removeItem(STORAGE_AUTOTANQUE_ID);
      }
      updateAutotanqueActivoLabel();
      void refreshTripulacionPanel();
      void refreshTarjetaPanel();
      void pollTelemetria();
      void cargarEventos();
      void cargarPedidos();
      btnInicioRuta.disabled = !autotanqueIdConsola();
      setStatus("", "");
    });
  }

  if (selTarjeta) {
    selTarjeta.addEventListener("change", updateTarjetaGuardarBtn);
  }
  if (btnGuardarTarjeta) {
    btnGuardarTarjeta.addEventListener("click", () => void guardarTarjeta());
  }

  if (selTripulacionChofer) {
    selTripulacionChofer.addEventListener("change", updateTripulacionGuardarBtn);
  }
  if (selTripulacionAyudante) {
    selTripulacionAyudante.addEventListener("change", updateTripulacionGuardarBtn);
  }
  if (btnGuardarTripulacion) {
    btnGuardarTripulacion.addEventListener("click", () => void guardarTripulacion());
  }

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
      const card = e.target && e.target.closest
        ? e.target.closest("article[data-pedido-id]")
        : null;
      if (card?.dataset?.pedidoId) {
        selectedPedidoId = card.dataset.pedidoId;
        const pedidoSel = getPedidoSeleccionado();
        renderPedidoActual(pedidoSel);
        for (const n of pedidoStack.querySelectorAll("article[data-pedido-id]")) {
          n.classList.toggle(
            "pedido-selected",
            String(n.dataset.pedidoId) === String(selectedPedidoId)
          );
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

      const atqPed = autotanqueIdConsola();
      if (!atqPed) {
        setStatus("Selecciona Planta → PDV Autotanque → número para operar pedidos.", "err");
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
              autotanque_id: atqPed,
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
              autotanque_id: atqPed,
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
    renderPedidoActual(null);
    cargarUnidades();
    cargarEventos();
    if (btnPedido) btnPedido.disabled = false;
    cargarPedidos();
  } else {
    renderPedidoActual(null);
    setStatus("Introduce la API key y pulsa «Guardar clave».", "");
    eventStack.innerHTML =
      '<p class="empty-stack">Configura la API key para ver el historial.</p>';
    if (selPlanta) {
      selPlanta.innerHTML = "";
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "— Guarde la API key —";
      selPlanta.appendChild(o);
    }
    resetPdvSelect();
    if (sidebarEstacionWrap) sidebarEstacionWrap.hidden = true;
    if (sidebarAlmacenWrap) sidebarAlmacenWrap.hidden = true;
    if (sidebarAutotanqueWrap) sidebarAutotanqueWrap.hidden = true;
    if (sidebarTripulacionWrap) sidebarTripulacionWrap.hidden = true;
  }

  // ------------------------------------------------------------------
  // Modal "Tarjetas asignadas por PDV" (botón de la barra de acciones)
  // ------------------------------------------------------------------
  const btnVerTarjetas = document.getElementById("btnVerTarjetas");
  const tarjetasModal = document.getElementById("tarjetasModal");
  const btnTarjetasCerrar = document.getElementById("btnTarjetasCerrar");
  const btnTarjetasRecargar = document.getElementById("btnTarjetasRecargar");
  const tarjetasTbody = document.getElementById("tarjetasTbody");
  const tarjetasStatusMsg = document.getElementById("tarjetasStatusMsg");

  if (tarjetasModal) tarjetasModal.hidden = true;

  function tarjetasSetMsg(text, kind) {
    if (!tarjetasStatusMsg) return;
    tarjetasStatusMsg.textContent = text || "";
    tarjetasStatusMsg.className = "status" + (kind ? " " + kind : "");
  }

  function tipoLabel(tipo) {
    if (tipo === "autotanque") return "Autotanque";
    if (tipo === "estacion") return "Estación";
    if (tipo === "almacen") return "Almacén";
    return tipo || "—";
  }

  function renderTarjetasTabla(activos) {
    if (!tarjetasTbody) return;
    if (!Array.isArray(activos) || activos.length === 0) {
      tarjetasTbody.innerHTML =
        '<tr><td colspan="5" class="tarjetas-empty">No hay PDVs registrados.</td></tr>';
      return;
    }
    const rows = activos
      .map((a) => {
        const planta = (a.planta_nombre || "—").toString();
        const tipo = tipoLabel(a.tipo);
        const nombre = a.tipo === "autotanque"
          ? "T-" + (a.activo_nombre || "").toString()
          : (a.activo_nombre || "—").toString();
        const placas = (a.placas && a.placas.trim()) ? a.placas : "—";
        const tarjetaTxt = a.tarjeta_nombre
          ? a.tarjeta_nombre
          : '<span class="tarjeta-vacia">Sin tarjeta</span>';
        const esc = (s) =>
          s
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        return (
          "<tr>" +
          "<td>" + esc(planta) + "</td>" +
          "<td>" + esc(tipo) + "</td>" +
          "<td>" + esc(nombre) + "</td>" +
          "<td>" + esc(placas) + "</td>" +
          "<td>" +
            (a.tarjeta_nombre ? esc(a.tarjeta_nombre) : tarjetaTxt) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
    tarjetasTbody.innerHTML = rows;
  }

  async function cargarTarjetasActivos() {
    if (!tarjetasTbody) return;
    tarjetasTbody.innerHTML =
      '<tr><td colspan="5" class="tarjetas-empty">Cargando…</td></tr>';
    tarjetasSetMsg("", "");
    try {
      const data = await fetchJson("/api/consola/activos-tarjetas", {
        headers: apiHeaders(),
      });
      renderTarjetasTabla(data.activos || []);
    } catch (e) {
      let msg = e.message || String(e);
      if (e.data?.hint) msg += " — " + e.data.hint;
      if (e.data?.pg_message) msg += " [pg: " + e.data.pg_message + "]";
      else if (e.data?.pg_detail) msg += " [pg: " + e.data.pg_detail + "]";
      tarjetasTbody.innerHTML =
        '<tr><td colspan="5" class="tarjetas-empty">No se pudo cargar.</td></tr>';
      tarjetasSetMsg(msg, "err");
    }
  }

  function abrirTarjetasModal() {
    if (!tarjetasModal) return;
    if (!inpApiKey.value.trim()) {
      setStatus("Introduce la API key y pulsa «Guardar clave» antes de ver las tarjetas.", "err");
      return;
    }
    tarjetasModal.hidden = false;
    cargarTarjetasActivos();
  }

  function cerrarTarjetasModal() {
    if (!tarjetasModal) return;
    tarjetasModal.hidden = true;
  }

  if (btnVerTarjetas) {
    btnVerTarjetas.addEventListener("click", abrirTarjetasModal);
  }
  if (btnTarjetasCerrar) {
    btnTarjetasCerrar.addEventListener("click", cerrarTarjetasModal);
  }
  if (btnTarjetasRecargar) {
    btnTarjetasRecargar.addEventListener("click", cargarTarjetasActivos);
  }
  if (tarjetasModal) {
    tarjetasModal.addEventListener("click", (ev) => {
      if (ev.target === tarjetasModal) cerrarTarjetasModal();
    });
  }
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && tarjetasModal && !tarjetasModal.hidden) {
      cerrarTarjetasModal();
    }
  });
})();

