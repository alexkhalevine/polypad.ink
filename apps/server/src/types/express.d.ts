declare global {
  namespace Express {
    interface Request {
      isMcp?: boolean;
    }
  }
}

export {};
