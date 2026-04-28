(function () {
  const STORAGE_KEY = "gasuber_consola_api_key";
  const STORAGE_PLANTA_ID = "gasuber_consola_planta_id";
  const STORAGE_PDV_ID = "gasuber_consola_pdv_id";
  const STORAGE_ESTACION_ID = "gasuber_consola_estacion_id";
  const STORAGE_ALMACEN_ID = "gasuber_consola_almacen_id";
  const STORAGE_AUTOTANQUE_ID = "gasuber_consola_autotanque_id";

  const selPlanta = document.getElementById("selPlanta");
  const selPdv = document.getElementById("selPdv");
  const selEstacion = document.getElementById("selEstacion");
  const sidebarEstacionWrap = document.getElementById("sidebarEstacionWrap");
  const selAlmacen = document.getElementById("selAlmacen");
  const sidebarAlmacenWrap = document.getElementById("sidebarAlmacenWrap");
  const selAutotanque = document.getElementById("selAutotanque");
  const sidebarAutotanqueWrap = document.getElementById("sidebarAutotanqueWrap");

  const sidebarTarjetaWrap = document.getElementById("sidebarTarjetaWrap");
  const selTarjeta = document.getElementById("selTarjeta");
  const btnGuardarTarjeta = document.getElementById("btnGuardarTarjeta");
  let tarjetaSaving = false;

  /** @type {Array<{id: string, nombre?: string, tarjeta_id?: string | null}>} */
  let lastEstacionesList = [];
  /** @type {typeof lastEstacionesList} */
  let lastAlmacenesList = [];
  /** @type {Array<{id: string, numero?: string, tarjeta_id?: string | null}>} */
  let lastAutotanquesList = [];
  /** @type {Array<{id: string, nombre: string}>} */
  let tarjetasCatalog = [];

  const inpApiKey = document.getElementById("inpApiKey");
  const btnGuardarKey = document.getElementById("btnGuardarKey");
  const statusMsg = document.getElementById("statusMsg");

  function setStatus(text, kind) {
    if (!statusMsg) return;
    statusMsg.textContent = text || "";
    statusMsg.className = "status" + (kind ? " " + kind : "");
  }

  function apiHeaders() {
    const key = (inpApiKey && inpApiKey.value ? inpApiKey.value.trim() : "") || sessionStorage.getItem(STORAGE_KEY);
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
    lastEstacionesList = [];
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
    lastAlmacenesList = [];
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
      o.textContent = e.status === 401 ? "API key no válida" : "Error cargando PDV";
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
    if (!selPlanta) return;
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
        e.status === 401
          ? "API key no válida"
          : hint
            ? "Falta crear tablas (ver aviso)"
            : "Error cargando plantas";
      selPlanta.appendChild(o);
      resetPdvSelect();
      if (hint || apiErr) setStatus([apiErr, hint].filter(Boolean).join(" — "), "err");
      else if (e.status !== 401) setStatus(e.message || "Error cargando plantas", "err");
      if (e.status !== 401) console.warn("[consola] cargarPlantas:", e);
    }
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

  async function syncEstacionUI(restore) {
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
    await cargarEstaciones(plantaId, restore);
  }

  async function syncAlmacenUI(restore) {
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
    await cargarAlmacenes(plantaId, restore);
  }

  async function syncAutotanqueUI(restore) {
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
    await cargarAutotanques(plantaId, restore);
  }

  async function ensureTarjetasCatalog() {
    if (tarjetasCatalog.length) return;
    const data = await fetchJson("/api/consola/tarjetas", { headers: apiHeaders() });
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
    btnGuardarTarjeta.disabled = tarjetaSaving;
  }

  async function refreshTarjetaPanel() {
    if (!sidebarTarjetaWrap || !selTarjeta) return;

    let tipo = null;
    let currentTarjetaId = "";

    if (pdvSeleccionadoEsEstacion() && selEstacion && selEstacion.value && !selEstacion.disabled) {
      tipo = "estacion";
      const row = lastEstacionesList.find((x) => String(x.id) === String(selEstacion.value));
      currentTarjetaId = row && row.tarjeta_id != null ? String(row.tarjeta_id) : "";
    } else if (pdvSeleccionadoEsAlmacen() && selAlmacen && selAlmacen.value && !selAlmacen.disabled) {
      tipo = "almacen";
      const row = lastAlmacenesList.find((x) => String(x.id) === String(selAlmacen.value));
      currentTarjetaId = row && row.tarjeta_id != null ? String(row.tarjeta_id) : "";
    } else if (pdvSeleccionadoEsAutotanque() && selAutotanque && selAutotanque.value && !selAutotanque.disabled) {
      tipo = "autotanque";
      const row = lastAutotanquesList.find((x) => String(x.id) === String(selAutotanque.value));
      currentTarjetaId = row && row.tarjeta_id != null ? String(row.tarjeta_id) : "";
    }

    if (!tipo) {
      hideTarjetaPanel();
      return;
    }

    try {
      await ensureTarjetasCatalog();
    } catch (e) {
      hideTarjetaPanel();
      return;
    }
    if (!tarjetasCatalog.length) {
      hideTarjetaPanel();
      return;
    }

    sidebarTarjetaWrap.removeAttribute("hidden");
    sidebarTarjetaWrap.hidden = false;
    buildTarjetaSelectOptions();
    selTarjeta.value = currentTarjetaId;
    selTarjeta.disabled = false;
    updateTarjetaGuardarBtn();
  }

  async function guardarTarjeta() {
    if (tarjetaSaving || !selTarjeta) return;

    let tipo = null;
    let activo_id = "";
    if (pdvSeleccionadoEsEstacion() && selEstacion && selEstacion.value && !selEstacion.disabled) {
      tipo = "estacion";
      activo_id = selEstacion.value;
    } else if (pdvSeleccionadoEsAlmacen() && selAlmacen && selAlmacen.value && !selAlmacen.disabled) {
      tipo = "almacen";
      activo_id = selAlmacen.value;
    } else if (pdvSeleccionadoEsAutotanque() && selAutotanque && selAutotanque.value && !selAutotanque.disabled) {
      tipo = "autotanque";
      activo_id = selAutotanque.value;
    }
    if (!tipo || !activo_id) return;

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
      if (plantaId) {
        if (tipo === "estacion") await cargarEstaciones(plantaId, true);
        else if (tipo === "almacen") await cargarAlmacenes(plantaId, true);
        else await cargarAutotanques(plantaId, true);
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
    hideTarjetaPanel();
  }

  async function bootstrap() {
    if (inpApiKey) inpApiKey.value = sessionStorage.getItem(STORAGE_KEY) || "";
    if (!inpApiKey || !inpApiKey.value.trim()) {
      setStatus("Introduce la API key y pulsa «Guardar clave».", "");
      bootstrapLockedUI();
      return;
    }

    if (selPlanta) selPlanta.disabled = false;
    await cargarPlantas();
  }

  if (btnGuardarKey) {
    btnGuardarKey.addEventListener("click", () => {
      const k = inpApiKey && inpApiKey.value ? inpApiKey.value.trim() : "";
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
        hideTarjetaPanel();
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
        void syncPdvDetalleUI(true);
      });
    };
    selPdv.addEventListener("change", onPdv);
    selPdv.addEventListener("input", onPdv);
  }

  if (selEstacion) {
    selEstacion.addEventListener("change", () => {
      if (selEstacion.value) sessionStorage.setItem(STORAGE_ESTACION_ID, selEstacion.value);
      else sessionStorage.removeItem(STORAGE_ESTACION_ID);
      void refreshTarjetaPanel();
    });
  }
  if (selAlmacen) {
    selAlmacen.addEventListener("change", () => {
      if (selAlmacen.value) sessionStorage.setItem(STORAGE_ALMACEN_ID, selAlmacen.value);
      else sessionStorage.removeItem(STORAGE_ALMACEN_ID);
      void refreshTarjetaPanel();
    });
  }
  if (selAutotanque) {
    selAutotanque.addEventListener("change", () => {
      if (selAutotanque.value) sessionStorage.setItem(STORAGE_AUTOTANQUE_ID, selAutotanque.value);
      else sessionStorage.removeItem(STORAGE_AUTOTANQUE_ID);
      void refreshTarjetaPanel();
    });
  }

  if (selTarjeta) selTarjeta.addEventListener("change", updateTarjetaGuardarBtn);
  if (btnGuardarTarjeta) btnGuardarTarjeta.addEventListener("click", () => void guardarTarjeta());

  bootstrap();
})();

