import { insertPedido } from "./pedidos.service";
import { parsePedidoTextoPlano, PRIORIDAD_NORMAL } from "./whatsapp-pedido-parser";
import { sendWhatsAppTextMessage } from "./whatsapp.service";

type MetaTextMessage = {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
};

type MetaContact = {
  wa_id?: string;
  profile?: { name?: string };
};

type MetaChangeValue = {
  contacts?: MetaContact[];
  messages?: MetaTextMessage[];
};

/**
 * Estado por defecto al insertar: la BD usa `recibido` (no existe enum `pendiente`).
 */
function buildInsertFromWhatsApp(
  telefonoOrigen: string,
  clienteNombre: string,
  direccionTexto: string,
  litros: number | null,
  unidadDbId: string
) {
  return {
    unidad_db_id: unidadDbId,
    telefono_origen: telefonoOrigen,
    cliente_nombre: clienteNombre,
    direccion_texto: direccionTexto,
    litros_solicitados: litros,
    prioridad: PRIORIDAD_NORMAL,
    colonia: "N/A",
    calle: "N/A",
    cp: 0,
    numero_exterior: "N/A",
    numero_interior: "N/A",
    tipo_origen: "casa" as const,
    nombre_empresa: "N/A",
  };
}

function contactNameForWaId(
  contacts: MetaContact[] | undefined,
  waId: string
): string | null {
  if (!contacts?.length) return null;
  const c = contacts.find((x) => x.wa_id === waId);
  const name = c?.profile?.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export async function processMetaWebhookPayload(body: unknown): Promise<void> {
  const enabled = process.env.WHATSAPP_ENABLED === "true";
  if (!enabled) {
    console.warn("[whatsapp-webhook] WHATSAPP_ENABLED no es true; se ignora el payload.");
    return;
  }

  const unidadId = process.env.WHATSAPP_DEFAULT_UNIDAD_DB_ID?.trim();
  if (!unidadId) {
    console.error(
      "[whatsapp-webhook] Falta WHATSAPP_DEFAULT_UNIDAD_DB_ID; no se crea pedido."
    );
    return;
  }

  const root = body as {
    entry?: Array<{
      changes?: Array<{ value?: MetaChangeValue }>;
    }>;
  };

  const entries = root.entry;
  if (!Array.isArray(entries)) {
    console.warn("[whatsapp-webhook] Payload sin entry[]; se ignora.");
    return;
  }

  for (const ent of entries) {
    const changes = ent.changes;
    if (!Array.isArray(changes)) continue;

    for (const ch of changes) {
      const value = ch.value;
      if (!value || typeof value !== "object") continue;

      const contacts = value.contacts;
      const messages = value.messages;
      if (!Array.isArray(messages)) continue;

      for (const msg of messages) {
        if (!msg || typeof msg !== "object") continue;

        if (msg.type !== "text") {
          console.log(
            `[whatsapp-webhook] Mensaje ignorado (solo texto en esta fase): type=${String(msg.type)} id=${String(msg.id)}`
          );
          continue;
        }

        const from = typeof msg.from === "string" ? msg.from.trim() : "";
        const wamid = typeof msg.id === "string" ? msg.id : "";
        const bodyText =
          msg.text && typeof msg.text.body === "string" ? msg.text.body : "";

        if (!from) {
          console.warn("[whatsapp-webhook] Mensaje sin from; se ignora.");
          continue;
        }

        console.log(
          `[whatsapp-webhook] Mensaje recibido wamid=${wamid} from=${from} body=${JSON.stringify(bodyText.slice(0, 200))}`
        );

        const clienteNombre =
          contactNameForWaId(contacts, from) || "Cliente";

        const { litros, direccion_texto } = parsePedidoTextoPlano(bodyText);
        const direccionFinal =
          direccion_texto.trim() ||
          `Pedido WhatsApp — ${litros != null ? `${litros} L` : "sin detalle"}`;

        try {
          const pedido = await insertPedido(
            buildInsertFromWhatsApp(
              from,
              clienteNombre,
              direccionFinal,
              litros,
              unidadId
            )
          );

          console.log(
            `[whatsapp-webhook] Pedido creado id=${pedido.id} telefono=${from} tel_origen=${pedido.telefono_origen}`
          );

          const confirmText = `Pedido recibido. Folio #${pedido.id} en proceso.`;
          await sendWhatsAppTextMessage(from, confirmText);
          console.log(
            `[whatsapp-webhook] Confirmación enviada a ${from} para pedido ${pedido.id}`
          );
        } catch (e) {
          console.error(
            "[whatsapp-webhook] Error creando pedido o enviando confirmación:",
            e
          );
        }
      }
    }
  }
}
