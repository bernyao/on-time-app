import api from "./api";

export async function saveCanvasConnection(icsUrl) {
  if (!icsUrl || typeof icsUrl !== "string") {
    throw new Error("ICS URL is required");
  }

  const trimmed = icsUrl.trim();
  if (!trimmed) {
    throw new Error("ICS URL is required");
  }

  return api.post("/canvas/connect", { icsUrl: trimmed });
}

export async function syncCanvas(optionalUrl) {
  if (optionalUrl && typeof optionalUrl !== "string") {
    throw new Error("ICS URL must be a string");
  }

  const payload =
    optionalUrl && optionalUrl.trim().length > 0
      ? { icsUrl: optionalUrl.trim() }
      : {};

  return api.post("/canvas/sync", payload);
}
