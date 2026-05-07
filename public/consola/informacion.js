(function () {
  const STORAGE_KEY = "gasuber_consola_api_key";
  const STORAGE_PLANTA_ID = "gasuber_consola_planta_id";
  const STORAGE_INFORMACION_PDV_KIND = "gasuber_consola_informacion_pdv_kind_v1";

  const selPlanta = document.getElementById("selPlanta");
  const inpApiKey = document.getElementById("inpApiKey");
  const btnGuardarKey = document.getElementById("btnGuardarKey");
  const statusMsg = document.getElementById("statusMsg");
  const pdvButtons = document.querySelectorAll(".informacion-pdv-btn[data-pdv-kind]");

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

  function setPdvKind(kind) {
    const allowed = new Set(["autotanque", "almacen", "estacion"]);
    if (!allowed.has(kind)) {
      sessionStorage.removeItem(STORAGE_INFORMACION_PDV_KIND);
      syncPdvButtonUI("");
      return;
    }
    sessionStorage.setItem(STORAGE_INFORMACION_PDV_KIND, kind);
    syncPdvButtonUI(kind);
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
        return;
      }
      sessionStorage.setItem(STORAGE_PLANTA_ID, id);
    });
  }

  pdvButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const kind = btn.getAttribute("data-pdv-kind") || "";
      setPdvKind(kind);
      const labels = { autotanque: "Autotanque", almacen: "Almacén", estacion: "Estaciones" };
      setStatus("PDV seleccionado: " + (labels[kind] || kind) + ".", "ok");
    });
  });

  initApiKeyField();
  const savedKind = sessionStorage.getItem(STORAGE_INFORMACION_PDV_KIND);
  syncPdvButtonUI(savedKind || "");
  cargarPlantas();
})();
