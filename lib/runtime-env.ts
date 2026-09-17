function readEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return process.env[key] ?? process.env[`NEXT_PUBLIC_${key}`];
  }
  return undefined;
}

export const runtimeEnv = new Proxy(
  {},
  {
    get(_target, prop: string) {
      return readEnv(prop);
    },
  },
) as Record<string, string | undefined>;
