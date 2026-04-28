(function () {
  /** Etapas del Kanban (como en tu imagen). */
  const COLS = [
    { id: "recepcion", title: "Recepción" },
    { id: "diagnostico", title: "Diagnóstico" },
    { id: "repuestos", title: "Repuestos" },
    { id: "aprobacion", title: "Aprobación" },
    { id: "reparacion", title: "Reparación" },
    { id: "control", title: "Control" },
    { id: "entrega", title: "Entrega" },
  ];

  const STORAGE_KEY = "gasuber_taller_kanban_v1";
  const STORAGE_PLANTA_FILTER = "gasuber_taller_planta_filter_v1";

  const inpBuscar = document.getElementById("inpBuscar");
  const selPlanta = document.getElementById("selPlanta");
  const btnDemo = document.getElementById("btnDemo");

  /** @type {Array<{id: string, col: string, planta: string, folio: string, cliente: string, vehiculo: string, placa: string, motivo: string, tecnico: string, created_at: string}>} */
  let items = [];

  /** @type {string|null} */
  let draggingId = null;

  function nowIso() {
    return new Date().toISOString();
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function demoItem(n, col) {
    const folio = "OT-" + String(20260000 + n);
    const placas = ["LFS-89375", "XAA-1234", "TST-9090", "GAS-2026", "PUE-1101"][n % 5];
    const clientes = ["Pedro", "María", "Trans Gas", "Cliente Mostrador", "Servicio Interno"][n % 5];
    const veh = ["AUTOTANQUE T-11", "CAMIÓN", "AUTOTANQUE T-06", "CAMIONETA", "AUTOTANQUE T-20"][n % 5];
    const motivos = [
      "Fuga menor, revisar conexiones.",
      "Cambio de aceite y filtros.",
      "Revisión de sensores de nivel.",
      "Falla eléctrica intermitente.",
      "Diagnóstico general.",
    ][n % 5];
    const tecnicos = ["Ángel O.", "Giovanni", "José M.", "Adair", "Santiago"][n % 5];
    const plantas = ["Puebla", "Tehuacan", "Queretaro", "Morelos", "Acapulco"];
    const planta = plantas[n % plantas.length];
    const d = new Date(Date.now() - (n * 37 + 10) * 60 * 1000);
    const created = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)} ${pad2(
      d.getHours()
    )}:${pad2(d.getMinutes())}`;

    return {
      id: cryptoId(),
      col,
      planta,
      folio,
      cliente: clientes,
      vehiculo: veh,
      placa: placas,
      motivo: motivos,
      tecnico: tecnicos,
      created_at: created,
    };
  }

  function cryptoId() {
    // suficientemente único para demo/local
    const a = Math.random().toString(16).slice(2);
    const b = Date.now().toString(16);
    return `${b}-${a}`.slice(0, 24);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return false;
      items = parsed.filter((x) => x && typeof x === "object");
      return items.length > 0;
    } catch {
      return false;
    }
  }

  function loadPlantaFilter() {
    try {
      const v = localStorage.getItem(STORAGE_PLANTA_FILTER);
      return typeof v === "string" && v.trim() ? v.trim() : "__ALL__";
    } catch {
      return "__ALL__";
    }
  }

  function savePlantaFilter(value) {
    try {
      localStorage.setItem(STORAGE_PLANTA_FILTER, value);
    } catch {
      // ignore
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }

  function setDemoData() {
    const seed = [];
    let n = 1;
    for (const c of COLS) {
      const count = c.id === "recepcion" ? 4 : c.id === "reparacion" ? 3 : 2;
      for (let i = 0; i < count; i++) {
        seed.push(demoItem(n++, c.id));
      }
    }
    items = seed;
    save();
    render();
  }

  function matchesSearch(it, q) {
    if (!q) return true;
    const hay = `${it.folio} ${it.cliente} ${it.vehiculo} ${it.placa} ${it.motivo} ${it.tecnico}`.toLowerCase();
    return hay.includes(q);
  }

  function matchesPlanta(it, planta) {
    if (!planta || planta === "__ALL__") return true;
    return String(it.planta || "").trim().toLowerCase() === String(planta).trim().toLowerCase();
  }

  function ensurePlantaOptions() {
    if (!selPlanta) return;
    const current = selPlanta.value || "__ALL__";
    const unique = Array.from(
      new Set(items.map((x) => String(x.planta || "").trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "es"));

    selPlanta.innerHTML = "";
    const all = document.createElement("option");
    all.value = "__ALL__";
    all.textContent = "Todas";
    selPlanta.appendChild(all);
    for (const p of unique) {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      selPlanta.appendChild(opt);
    }

    const saved = loadPlantaFilter();
    const canUse = saved === "__ALL__" || unique.includes(saved);
    selPlanta.value = canUse ? saved : "__ALL__";

    // si venía de un estado anterior
    if (current && (current === "__ALL__" || unique.includes(current))) {
      selPlanta.value = current;
    }
  }

  function render() {
    const q = (inpBuscar && inpBuscar.value ? inpBuscar.value : "").trim().toLowerCase();
    const planta = selPlanta && selPlanta.value ? selPlanta.value : loadPlantaFilter();

    // limpia columnas
    for (const c of COLS) {
      const drop = document.querySelector(`[data-drop="${c.id}"]`);
      if (drop) drop.innerHTML = "";
    }

    // render cards
    for (const it of items) {
      const drop = document.querySelector(`[data-drop="${it.col}"]`);
      if (!drop) continue;
      if (!matchesPlanta(it, planta)) continue;
      if (!matchesSearch(it, q)) continue;
      drop.appendChild(renderCard(it));
    }

    // conteos (filtrados por planta, para coincidir con la vista)
    for (const c of COLS) {
      const countEl = document.querySelector(`[data-count="${c.id}"]`);
      if (!countEl) continue;
      const count = items.filter((x) => x.col === c.id && matchesPlanta(x, planta)).length;
      countEl.textContent = String(count);
    }
  }

  function renderCard(it) {
    const el = document.createElement("article");
    el.className = "kanban-card";
    el.setAttribute("draggable", "true");
    el.dataset.itemId = it.id;
    el.innerHTML = `
      <div class="kanban-card-top">
        <div class="kanban-folio">${escapeHtml(it.folio)}</div>
        <div class="kanban-ts">${escapeHtml(it.created_at)}</div>
      </div>
      <div class="kanban-main">
        <div class="kanban-row"><span class="k">Planta</span><span class="v">${escapeHtml(it.planta || "—")}</span></div>
        <div class="kanban-row"><span class="k">Cliente</span><span class="v">${escapeHtml(it.cliente)}</span></div>
        <div class="kanban-row"><span class="k">Vehículo</span><span class="v">${escapeHtml(it.vehiculo)}</span></div>
        <div class="kanban-row"><span class="k">Placa</span><span class="v">${escapeHtml(it.placa)}</span></div>
        <div class="kanban-row"><span class="k">Motivo</span><span class="v">${escapeHtml(it.motivo)}</span></div>
        <div class="kanban-row"><span class="k">Técnico</span><span class="v">${escapeHtml(it.tecnico)}</span></div>
      </div>
      <div class="kanban-card-actions">
        <button type="button" class="kanban-mini" data-act="prev" title="Mover a etapa anterior">←</button>
        <button type="button" class="kanban-mini" data-act="next" title="Mover a siguiente etapa">→</button>
      </div>
    `;

    el.addEventListener("dragstart", () => {
      draggingId = it.id;
      el.classList.add("dragging");
    });
    el.addEventListener("dragend", () => {
      draggingId = null;
      el.classList.remove("dragging");
      document.querySelectorAll(".kanban-drop.drag-over").forEach((n) => n.classList.remove("drag-over"));
    });

    el.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest ? e.target.closest("button[data-act]") : null;
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === "prev") moveRelative(it.id, -1);
      if (act === "next") moveRelative(it.id, +1);
    });

    return el;
  }

  function moveRelative(id, delta) {
    const idx = items.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const col = items[idx].col;
    const cIdx = COLS.findIndex((c) => c.id === col);
    if (cIdx < 0) return;
    const next = COLS[cIdx + delta];
    if (!next) return;
    items[idx].col = next.id;
    save();
    render();
  }

  function setUpDnD() {
    document.querySelectorAll(".kanban-drop").forEach((drop) => {
      drop.addEventListener("dragover", (e) => {
        e.preventDefault();
        drop.classList.add("drag-over");
      });
      drop.addEventListener("dragleave", () => {
        drop.classList.remove("drag-over");
      });
      drop.addEventListener("drop", (e) => {
        e.preventDefault();
        drop.classList.remove("drag-over");
        if (!draggingId) return;
        const col = drop.getAttribute("data-drop");
        if (!col) return;
        const idx = items.findIndex((x) => x.id === draggingId);
        if (idx < 0) return;
        items[idx].col = col;
        save();
        render();
      });
    });
  }

  // init
  setUpDnD();
  const ok = load();
  if (!ok) setDemoData();
  ensurePlantaOptions();
  render();

  if (inpBuscar) {
    inpBuscar.addEventListener("input", () => render());
  }
  if (selPlanta) {
    selPlanta.addEventListener("change", () => {
      const v = selPlanta.value || "__ALL__";
      savePlantaFilter(v);
      render();
    });
    // restaura preferencia guardada
    const saved = loadPlantaFilter();
    if (saved) selPlanta.value = saved;
  }
  if (btnDemo) {
    btnDemo.addEventListener("click", () => {
      setDemoData();
      ensurePlantaOptions();
      render();
    });
  }

  // Debug-friendly marker in storage (no se usa por ahora, pero útil para futuras migraciones).
  try {
    localStorage.setItem("gasuber_taller_last_open", nowIso());
  } catch {
    // ignore
  }
})();

