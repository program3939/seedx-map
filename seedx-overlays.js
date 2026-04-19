(() => {
  const DATA_URL = "tiles/world/seedx-overlays.json";
  const REFRESH_MS = 1000;
  let layerGroup;
  let lastPayload = "";

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function map() {
    return window.pl3xmap?.map;
  }

  function isOverworldReady() {
    const currentWorld = window.pl3xmap?.worldManager?.currentWorld;
    return window.L && map() && (!currentWorld || currentWorld.name === "world");
  }

  function point(x, z) {
    return [z, x];
  }

  function popup(title, rows) {
    return `<div class="seedx-popup"><h3>${escapeHtml(title)}</h3>${rows
      .map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`)
      .join("")}</div>`;
  }

  function markerIcon(type, label) {
    return L.divIcon({
      className: "",
      html: `<div class="seedx-marker seedx-marker--${type}">${escapeHtml(label)}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -16]
    });
  }

  function drawClaims(data) {
    for (const claim of data.claims ?? []) {
      const color = claim.color || "#f5c542";
      const rect = L.rectangle(
        [point(claim.minX, claim.minZ), point(claim.maxX, claim.maxZ)],
        {
          color,
          weight: claim.wartime ? 2 : 1,
          fillColor: color,
          fillOpacity: claim.wartime ? 0.36 : 0.22,
          opacity: 0.85
        }
      );
      rect.bindTooltip(`${claim.land} (${claim.chunkX}/${claim.chunkZ})`, { sticky: true });
      rect.bindPopup(popup(claim.land, [
        ["Nation", claim.nation || "Keine Nation"],
        ["Leitung", claim.leader || "Unbekannt"],
        ["Mitglieder", (claim.members || []).join(", ") || "Keine"],
        ["Chunk", `${claim.chunkX} / ${claim.chunkZ}`],
        ["Status", claim.wartime ? "Krieg" : "Frieden"]
      ]));
      rect.addTo(layerGroup);
    }
  }

  function drawFlags(data) {
    for (const flag of data.flags ?? []) {
      const marker = L.marker(point(flag.x, flag.z), { icon: markerIcon("flag", `F${flag.id}`) });
      marker.bindPopup(popup(`Flagge F${flag.id}`, [
        ["Land", flag.land],
        ["Position", `${flag.x} / ${flag.y} / ${flag.z}`]
      ]));
      marker.addTo(layerGroup);
    }
  }

  function drawPlayers(data) {
    for (const player of data.players ?? []) {
      const shortName = String(player.name || "?").slice(0, 2).toUpperCase();
      const marker = L.marker(point(player.x, player.z), { icon: markerIcon("player", shortName) });
      marker.bindTooltip(player.name || "Spieler", {
        direction: "top",
        offset: [0, -14],
        permanent: true
      });
      marker.bindPopup(popup(player.name || "Spieler", [
        ["Land", player.land || "Wildnis"],
        ["Position", `${Math.round(player.x)} / ${Math.round(player.y)} / ${Math.round(player.z)}`],
        ["UUID", player.uuid || "Unbekannt"]
      ]));
      marker.addTo(layerGroup);
    }
  }

  function drawSpawns(data) {
    for (const spawn of data.spawns ?? []) {
      const marker = L.marker(point(spawn.x, spawn.z), { icon: markerIcon("spawn", "SP") });
      marker.bindPopup(popup("Land-Spawn", [
        ["Land", spawn.land],
        ["Position", `${Math.round(spawn.x)} / ${Math.round(spawn.y)} / ${Math.round(spawn.z)}`]
      ]));
      marker.addTo(layerGroup);
    }
  }

  async function refresh() {
    if (!isOverworldReady()) {
      return;
    }
    try {
      const response = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const payload = await response.text();
      if (payload === lastPayload) {
        return;
      }
      lastPayload = payload;
      const data = JSON.parse(payload);
      if (layerGroup) {
        layerGroup.remove();
      }
      layerGroup = L.layerGroup().addTo(map());
      drawClaims(data);
      drawPlayers(data);
      drawFlags(data);
      drawSpawns(data);
    } catch (error) {
      console.warn("SeedX Overlays konnten nicht aktualisiert werden.", error);
    }
  }

  window.addEventListener("worldselected", () => {
    lastPayload = "";
    if (layerGroup) {
      layerGroup.remove();
      layerGroup = null;
    }
    refresh();
  });

  setInterval(refresh, REFRESH_MS);
  window.addEventListener("load", refresh);
})();
