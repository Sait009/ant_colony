/** Render-only randomness (cosmetic; never use in the sim). */
export const rand = (a: number, b: number): number => a + Math.random() * (b - a);
