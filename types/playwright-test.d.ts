declare module '@playwright/test' {
  export type Page = any

  export type TestCallback = (args: { page: Page }) => Promise<void> | void
  export type TestGroupCallback = () => void

  export interface TestApi {
    (name: string, callback: TestCallback): void
    describe(name: string, callback: TestGroupCallback): void
  }

  export const test: TestApi
  export const expect: any
  export const devices: Record<string, any>
  export function defineConfig(config: any): any
}
