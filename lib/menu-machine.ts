/**
 * CYBER-BITE unified state machine.
 *
 * Every interactive parameter on the dashboard (system load, protocol
 * add-ons, mobile viewport power state, checkout phase, audio) lives in this
 * single reducer. Components only ever read `MenuState` and dispatch
 * `MenuEvent`s — the 3D scene, control panel and checkout button all derive
 * their output from the same source of truth.
 */

export type LoadId = "DOUBLE" | "TRIPLE" | "OVERLOAD";
export type ProtocolId = "JALAPENO" | "GOUDA" | "BACON" | "PLASMA";
export type ViewportPower = "OFFLINE" | "ONLINE";
export type CheckoutPhase = "IDLE" | "TRANSMITTING" | "CONFIRMED";

export interface LoadSpec {
  id: LoadId;
  label: string;
  spec: string;
  code: string;
  patties: number;
  price: number;
}

export interface ProtocolSpec {
  id: ProtocolId;
  label: string;
  code: string;
  detail: string;
  price: number;
  grams: number;
  kcal: number;
}

export const LOADS: readonly LoadSpec[] = [
  { id: "DOUBLE", label: "DOUBLE STACK", spec: "2x 150g", code: "LD-02", patties: 2, price: 19.42 },
  { id: "TRIPLE", label: "TRIPLE STACK", spec: "3x 150g", code: "LD-03", patties: 3, price: 24.17 },
  { id: "OVERLOAD", label: "OVERLOAD", spec: "4x 150g", code: "LD-04", patties: 4, price: 28.93 },
];

export const PROTOCOLS: readonly ProtocolSpec[] = [
  { id: "JALAPENO", label: "Protocol: Spicy Jalapeños", code: "JLP-01", detail: "Pickled ring array // 8,000 SHU", price: 1.25, grams: 30, kcal: 8 },
  { id: "GOUDA", label: "Protocol: Smoked Gouda", code: "GDA-02", detail: "Beechwood-smoked slice upgrade", price: 1.85, grams: 40, kcal: 140 },
  { id: "BACON", label: "Protocol: Bacon Lattice", code: "BCN-03", detail: "Double-cut strips // crisp mode", price: 2.4, grams: 45, kcal: 230 },
  { id: "PLASMA", label: "Protocol: Plasma Sauce", code: "PLS-04", detail: "Chipotle-aioli emulsion base", price: 0.95, grams: 20, kcal: 90 },
];

export const loadById = (id: LoadId) => LOADS.find((l) => l.id === id)!;

export interface MenuState {
  load: LoadId;
  protocols: Record<ProtocolId, boolean>;
  /** Only relevant below 1024px — desktop always renders the viewport. */
  viewport: ViewportPower;
  checkout: CheckoutPhase;
  orderId: string | null;
  audio: boolean;
}

export type MenuEvent =
  | { type: "SELECT_LOAD"; load: LoadId }
  | { type: "TOGGLE_PROTOCOL"; protocol: ProtocolId }
  | { type: "SET_VIEWPORT"; power: ViewportPower }
  | { type: "TOGGLE_AUDIO" }
  | { type: "EXECUTE" }
  | { type: "EXECUTE_COMPLETE"; orderId: string }
  | { type: "RESET_CHECKOUT" };

export const initialMenuState: MenuState = {
  load: "DOUBLE",
  protocols: { JALAPENO: false, GOUDA: false, BACON: false, PLASMA: false },
  viewport: "OFFLINE",
  checkout: "IDLE",
  orderId: null,
  audio: true,
};

export function menuReducer(state: MenuState, event: MenuEvent): MenuState {
  switch (event.type) {
    case "SELECT_LOAD":
      // Configuration is locked while an order is in flight.
      if (state.checkout === "TRANSMITTING" || state.load === event.load) return state;
      return { ...state, load: event.load, checkout: "IDLE", orderId: null };
    case "TOGGLE_PROTOCOL":
      if (state.checkout === "TRANSMITTING") return state;
      return {
        ...state,
        protocols: { ...state.protocols, [event.protocol]: !state.protocols[event.protocol] },
        checkout: "IDLE",
        orderId: null,
      };
    case "SET_VIEWPORT":
      return { ...state, viewport: event.power };
    case "TOGGLE_AUDIO":
      return { ...state, audio: !state.audio };
    case "EXECUTE":
      return state.checkout === "IDLE" ? { ...state, checkout: "TRANSMITTING" } : state;
    case "EXECUTE_COMPLETE":
      return state.checkout === "TRANSMITTING"
        ? { ...state, checkout: "CONFIRMED", orderId: event.orderId }
        : state;
    case "RESET_CHECKOUT":
      return { ...state, checkout: "IDLE", orderId: null };
  }
}

/* ---------- Derived selectors ---------- */

export const activeProtocols = (state: MenuState) =>
  PROTOCOLS.filter((p) => state.protocols[p.id]);

export function selectTotal(state: MenuState): number {
  const base = loadById(state.load).price;
  const extras = activeProtocols(state).reduce((sum, p) => sum + p.price, 0);
  return Math.round((base + extras) * 100) / 100;
}

export function selectPayload(state: MenuState) {
  const load = loadById(state.load);
  const extras = activeProtocols(state);
  // Buns, lettuce and one cheddar slice per patty make up the fixed payload.
  const grams = load.patties * 150 + load.patties * 20 + 140 + extras.reduce((s, p) => s + p.grams, 0);
  const kcal = load.patties * 380 + 320 + extras.reduce((s, p) => s + p.kcal, 0);
  return { grams, kcal };
}

export const formatPrice = (value: number) => `$${value.toFixed(2)}`;
