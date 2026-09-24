import type { ProtocolId } from "./menu-machine";

/**
 * Converts the menu configuration into a vertical list of burger layers.
 * The 3D scene animates each layer toward its `y`, so changing the system
 * load re-flows the stack (and its height) instead of snapping.
 */

export type LayerKind =
  | "bunBottom"
  | "sauce"
  | "lettuce"
  | "patty"
  | "cheese"
  | "bacon"
  | "jalapeno"
  | "bunTop";

export interface Layer {
  id: string;
  kind: LayerKind;
  /** Bottom of the layer in stack space (after centering). */
  y: number;
  height: number;
  /** Protocol whose bounding box should wrap this layer, if any. */
  protocol?: ProtocolId;
}

const HEIGHT: Record<LayerKind, number> = {
  bunBottom: 0.5,
  sauce: 0.06,
  lettuce: 0.12,
  patty: 0.34,
  cheese: 0.06,
  bacon: 0.1,
  jalapeno: 0.1,
  bunTop: 0.92,
};

export function buildStack(patties: number, protocols: Record<ProtocolId, boolean>) {
  const raw: Omit<Layer, "y">[] = [{ id: "bun-bottom", kind: "bunBottom", height: HEIGHT.bunBottom }];

  if (protocols.PLASMA) raw.push({ id: "sauce", kind: "sauce", height: HEIGHT.sauce, protocol: "PLASMA" });
  raw.push({ id: "lettuce", kind: "lettuce", height: HEIGHT.lettuce });

  for (let i = 0; i < patties; i++) {
    raw.push({ id: `patty-${i}`, kind: "patty", height: HEIGHT.patty });
    raw.push({
      id: `cheese-${i}`,
      kind: "cheese",
      height: HEIGHT.cheese,
      protocol: protocols.GOUDA ? "GOUDA" : undefined,
    });
  }

  if (protocols.BACON) raw.push({ id: "bacon", kind: "bacon", height: HEIGHT.bacon, protocol: "BACON" });
  if (protocols.JALAPENO) raw.push({ id: "jalapeno", kind: "jalapeno", height: HEIGHT.jalapeno, protocol: "JALAPENO" });
  raw.push({ id: "bun-top", kind: "bunTop", height: HEIGHT.bunTop });

  const total = raw.reduce((sum, l) => sum + l.height, 0);
  let cursor = -total / 2;
  const layers: Layer[] = raw.map((l) => {
    const layer = { ...l, y: cursor };
    cursor += l.height;
    return layer;
  });

  return { layers, total };
}
