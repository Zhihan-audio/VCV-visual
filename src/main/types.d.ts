declare module 'node-osc' {
  export class Server {
    constructor(port: number, host?: string, callback?: () => void);
    on(event: 'message', callback: (msg: any[], rinfo: any) => void): void;
    on(event: 'error', callback: (err: Error) => void): void;
    close(): void;
  }
}
