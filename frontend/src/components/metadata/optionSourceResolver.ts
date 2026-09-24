import type { FieldOption } from './fieldDefinition';

export type OptionSourceHandler = (reference: string) => Promise<FieldOption[]>;
export type OptionSourceHandlers = Record<string, OptionSourceHandler>;

export async function resolveOptionSources(sources: string[], handlers: OptionSourceHandlers) {
  const uniqueSources = [...new Set(sources.filter(Boolean))];
  const entries = await Promise.all(uniqueSources.map(async (source) => {
    const separator = source.indexOf(':');
    if (separator < 1) return [source, [] as FieldOption[]] as const;
    const handler = handlers[source.slice(0, separator)];
    return [source, handler ? await handler(source.slice(separator + 1)) : [] as FieldOption[]] as const;
  }));
  return new Map(entries);
}
