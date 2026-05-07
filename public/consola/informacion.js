(function () {
  const STORAGE_KEY = "gasuber_consola_api_key";
  const STORAGE_PLANTA_ID = "gasuber_consola_planta_id";
  const STORAGE_INFORMACION_PDV_KIND = "gasuber_consola_informacion_pdv_kind_v1";
  const STORAGE_INFORMACION_AUTOTANQUE_SECCION = "gasuber_consola_informacion_autotanque_seccion_v1";
  const PLANTA_PUEBLA_ID = "1";

  const selPlanta = document.getElementById("selPlanta");
  const inpApiKey = document.getElementById("inpApiKey");
  const btnGuardarKey = document.getElementById("btnGuardarKey");
  const statusMsg = document.getElementById("statusMsg");
  const pdvButtons = document.querySelectorAll(".informacion-pdv-btn[data-pdv-kind]");
  const wrapAutotanque = document.getElementById("informacionAutotanqueWrap");
  const hostTabla = document.getElementById("informacionTablaHost");
  const tituloTabla = document.getElementById("informacionTablaTitulo");
  const avisoTabla = document.getElementById("informacionTablaAviso");
  const theadRow = document.getElementById("informacionTheadRow");
  const tbody = document.getElementById("informacionTbody");
  const subpdvButtons = document.querySelectorAll(".informacion-subpdv-btn[data-autotanque-seccion]");

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

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function syncPdvButtonUI(kind) {
    const allowed = new Set(["autotanque", "almacen", "estacion"]);
    const k = allowed.has(kind) ? kind : "";
    pdvButtons.forEach((btn) => {
      const v = btn.getAttribute("data-pdv-kind") || "";
      const on = k && v === k;
      btn.classList.toggle("is-selected", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function syncSubpdvButtonUI(seccion) {
    subpdvButtons.forEach((btn) => {
      const v = btn.getAttribute("data-autotanque-seccion") || "";
      const on = seccion && v === seccion;
      btn.classList.toggle("is-selected", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function setPdvKind(kind) {
    const allowed = new Set(["autotanque", "almacen", "estacion"]);
    if (!allowed.has(kind)) {
      sessionStorage.removeItem(STORAGE_INFORMACION_PDV_KIND);
      syncPdvButtonUI("");
      ocultarAutotanqueCompleto();
      return;
    }
    sessionStorage.setItem(STORAGE_INFORMACION_PDV_KIND, kind);
    syncPdvButtonUI(kind);
    if (kind === "autotanque") {
      if (wrapAutotanque) wrapAutotanque.hidden = false;
    } else {
      sessionStorage.removeItem(STORAGE_INFORMACION_AUTOTANQUE_SECCION);
      ocultarAutotanqueCompleto();
    }
  }

  function ocultarAutotanqueCompleto() {
    if (wrapAutotanque) wrapAutotanque.hidden = true;
    if (hostTabla) hostTabla.hidden = true;
    syncSubpdvButtonUI("");
    if (tbody) tbody.innerHTML = "";
    if (theadRow) theadRow.innerHTML = "";
    if (tituloTabla) tituloTabla.textContent = "";
    if (avisoTabla) {
      avisoTabla.hidden = true;
      avisoTabla.textContent = "";
    }
  }

  function renderTablaDesdeApi(data) {
    if (!theadRow || !tbody || !tituloTabla || !hostTabla || !avisoTabla) return;

    tituloTabla.textContent = data.titulo || "";
    const datosCargados = Boolean(data.datos_cargados);
    const plantaId = selPlanta && selPlanta.value ? String(selPlanta.value) : "";
    if (!datosCargados && plantaId) {
      avisoTabla.hidden = false;
      avisoTabla.textContent =
        "Los encabezados aplican a todas las plantas. El expediente detallado solo está cargado para Puebla (ID " +
        PLANTA_PUEBLA_ID +
        "); en otras plantas verá la columna NUMERO según la base de datos. Podrá ampliar datos por planta más adelante.";
    } else {
      avisoTabla.hidden = true;
      avisoTabla.textContent = "";
    }

    theadRow.innerHTML = "";
    const columnas = data.columnas || [];
    for (const col of columnas) {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = col.etiqueta || col.key;
      theadRow.appendChild(th);
    }

    tbody.innerHTML = "";
    const filas = data.filas || [];
    if (!filas.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = Math.max(columnas.length, 1);
      td.className = "informacion-celda-vacia";
      td.textContent = "Sin registros de autotanque para esta planta en la base de datos.";
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      for (const fila of filas) {
        const tr = document.createElement("tr");
        for (const col of columnas) {
          const td = document.createElement("td");
          const raw = fila[col.key];
          const t = raw == null || String(raw).trim() === "" ? "" : String(raw);
          if (!t) {
            td.className = "informacion-celda-vacia";
            td.textContent = "—";
          } else {
            td.innerHTML = escapeHtml(t);
          }
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
    }

    hostTabla.hidden = false;
  }

  async function cargarTablaAutotanque(seccion) {
    if (!seccion) return;
    const plantaId = selPlanta && selPlanta.value ? String(selPlanta.value).trim() : "";
    if (!plantaId) {
      setStatus("Seleccione una planta para ver la tabla.", "err");
      if (hostTabla) hostTabla.hidden = true;
      return;
    }
    const key = (inpApiKey && inpApiKey.value.trim()) || sessionStorage.getItem(STORAGE_KEY);
    if (!key) {
      setStatus("Guarde la API key para cargar la tabla.", "err");
      return;
    }
    try {
      const q =
        "/api/consola/informacion-autotanque?planta_id=" +
        encodeURIComponent(plantaId) +
        "&seccion=" +
        encodeURIComponent(seccion);
      const data = await fetchJson(q, { headers: apiHeaders() });
      renderTablaDesdeApi(data);
      setStatus("", "");
    } catch (e) {
      if (hostTabla) hostTabla.hidden = true;
      const hint = e.data && e.data.hint;
      const apiErr = e.data && e.data.error;
      if (hint || apiErr) setStatus([apiErr, hint].filter(Boolean).join(" — "), "err");
      else setStatus(e.message || "Error cargando información", "err");
      if (e.status !== 401) console.warn("[informacion] cargarTablaAutotanque:", e);
    }
  }

  function setAutotanqueSeccion(seccion) {
    sessionStorage.setItem(STORAGE_INFORMACION_AUTOTANQUE_SECCION, seccion);
    syncSubpdvButtonUI(seccion);
    cargarTablaAutotanque(seccion);
  }

  async function cargarPlantas() {
    if (!selPlanta) return;
    const key = (inpApiKey && inpApiKey.value.trim()) || sessionStorage.getItem(STORAGE_KEY);
    if (!key) {
      selPlanta.innerHTML = "";
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "— Guarde la API key arriba —";
      selPlanta.appendChild(o);
      return;
    }
    try {
      const data = await fetchJson("/api/consola/plantas", { headers: apiHeaders() });
      selPlanta.innerHTML = "";
      const plantas = data.plantas || [];
      if (!plantas.length) {
        const o = document.createElement("option");
        o.value = "";
        o.textContent = "Sin plantas en BD";
        selPlanta.appendChild(o);
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
      } else {
        sessionStorage.removeItem(STORAGE_PLANTA_ID);
      }

      const pdvKind = sessionStorage.getItem(STORAGE_INFORMACION_PDV_KIND);
      const sec = sessionStorage.getItem(STORAGE_INFORMACION_AUTOTANQUE_SECCION);
      if (pdvKind === "autotanque" && sec && wrapAutotanque && !wrapAutotanque.hidden) {
        syncSubpdvButtonUI(sec);
        await cargarTablaAutotanque(sec);
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
      if (hint || apiErr) setStatus([apiErr, hint].filter(Boolean).join(" — "), "err");
      else if (e.status !== 401) setStatus(e.message || "Error cargando plantas", "err");
      if (e.status !== 401) console.warn("[informacion] cargarPlantas:", e);
    }
  }

  function initApiKeyField() {
    if (!inpApiKey) return;
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) inpApiKey.value = saved;
  }

  if (btnGuardarKey && inpApiKey) {
    btnGuardarKey.addEventListener("click", () => {
      const key = inpApiKey.value.trim();
      if (!key) {
        sessionStorage.removeItem(STORAGE_KEY);
        setStatus("Clave vacía: se borró la sesión.", "err");
        cargarPlantas();
        return;
      }
      sessionStorage.setItem(STORAGE_KEY, key);
      setStatus("Clave guardada en esta sesión.", "ok");
      cargarPlantas();
    });
  }

  if (selPlanta) {
    selPlanta.addEventListener("change", () => {
      const id = selPlanta.value;
      if (!id) {
        sessionStorage.removeItem(STORAGE_PLANTA_ID);
        if (hostTabla) hostTabla.hidden = true;
        return;
      }
      sessionStorage.setItem(STORAGE_PLANTA_ID, id);
      const sec = sessionStorage.getItem(STORAGE_INFORMACION_AUTOTANQUE_SECCION);
      const pdvKind = sessionStorage.getItem(STORAGE_INFORMACION_PDV_KIND);
      if (pdvKind === "autotanque" && sec) cargarTablaAutotanque(sec);
    });
  }

  pdvButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const kind = btn.getAttribute("data-pdv-kind") || "";
      setPdvKind(kind);
      const labels = { autotanque: "Autotanque", almacen: "Almacén", estacion: "Estaciones" };
      setStatus("PDV seleccionado: " + (labels[kind] || kind) + ".", "ok");
      if (kind === "autotanque") {
        const sec = sessionStorage.getItem(STORAGE_INFORMACION_AUTOTANQUE_SECCION);
        if (sec) {
          syncSubpdvButtonUI(sec);
          cargarTablaAutotanque(sec);
        } else if (hostTabla) {
          hostTabla.hidden = true;
        }
      }
    });
  });

  subpdvButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const seccion = btn.getAttribute("data-autotanque-seccion") || "";
      if (!seccion) return;
      setAutotanqueSeccion(seccion);
    });
  });

  initApiKeyField();
  const savedKind = sessionStorage.getItem(STORAGE_INFORMACION_PDV_KIND) || "";
  syncPdvButtonUI(savedKind);
  if (savedKind === "autotanque" && wrapAutotanque) {
    wrapAutotanque.hidden = false;
    const sec = sessionStorage.getItem(STORAGE_INFORMACION_AUTOTANQUE_SECCION);
    if (sec) syncSubpdvButtonUI(sec);
  }
  cargarPlantas();
})();
