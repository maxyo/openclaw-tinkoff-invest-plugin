declare module 'openclaw/plugin-sdk/agents/tools/common' {
  export function readStringParam(
    params: Record<string, unknown>,
    key: string,
    options: { required: true; trim?: boolean; label?: string; allowEmpty?: boolean },
  ): string;
  export function readStringParam(
    params: Record<string, unknown>,
    key: string,
    options?: { required?: boolean; trim?: boolean; label?: string; allowEmpty?: boolean },
  ): string | undefined;

  export function readNumberParam(
    params: Record<string, unknown>,
    key: string,
    options?: { required?: boolean; label?: string; integer?: boolean; strict?: boolean },
  ): number | undefined;

  export function readStringArrayParam(
    params: Record<string, unknown>,
    key: string,
    options: { required: true; trim?: boolean; label?: string; allowEmpty?: boolean },
  ): string[];
  export function readStringArrayParam(
    params: Record<string, unknown>,
    key: string,
    options?: { required?: boolean; trim?: boolean; label?: string; allowEmpty?: boolean },
  ): string[] | undefined;
}
