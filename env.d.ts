// env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    JWT_SECRET: string;
    JWT_LIFETIME?: string;
  }
}
