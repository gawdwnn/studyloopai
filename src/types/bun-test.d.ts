declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void): void;
  export function beforeEach(fn: () => void): void;
  export function afterEach(fn: () => void): void;
  export function beforeAll(fn: () => void): void;
  export function afterAll(fn: () => void): void;
  
  export interface Expectation<T> {
    toBe(expected: T): void;
    toBeCloseTo(expected: number, precision?: number): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toBeNull(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeGreaterThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toEqual(expected: T): void;
    toContain(expected: unknown): void;
    toThrow(expected?: string | RegExp): void;
    not: Expectation<T>;
  }
  
  export function expect<T>(actual: T): Expectation<T>;
}