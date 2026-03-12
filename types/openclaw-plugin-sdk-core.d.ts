declare module 'openclaw/plugin-sdk/core' {
  export type OpenClawPluginApi = {
    id: string;
    name: string;
    version?: string;
    description?: string;
    source: string;
    pluginConfig?: Record<string, unknown>;
    logger: {
      info(message: string): void;
      warn(message: string): void;
      error(message: string): void;
      debug(message: string): void;
    };
    registerTool(tool: {
      name: string;
      label?: string;
      description?: string;
      parameters?: Record<string, unknown>;
      ownerOnly?: boolean;
      execute: (
        toolCallId: string,
        params: Record<string, unknown>,
      ) => Promise<unknown> | unknown;
    }): void;
  };

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
