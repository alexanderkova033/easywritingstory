declare global {
  namespace Express {
    interface Request {
      requestId: string;
      log: {
        info: (msg: string, extra?: Record<string, unknown>) => void;
        warn: (msg: string, extra?: Record<string, unknown>) => void;
        error: (msg: string, extra?: Record<string, unknown>) => void;
      };
    }
  }
}

export {};
