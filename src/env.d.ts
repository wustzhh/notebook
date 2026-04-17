/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'sql.js' {
  export interface Database {
    run(sql: string, params?: any[]): void
    exec(sql: string): any[]
    prepare(sql: string): Statement
    export(): Uint8Array
  }

  export interface Statement {
    bind(params?: any[]): void
    step(): boolean
    get(): any[]
    getColumnNames(): string[]
    getAsObject(params?: any): any
    free(): void
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database
  }

  export default function initSqlJs(config?: any): Promise<SqlJsStatic>
}
