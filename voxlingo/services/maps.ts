export interface LocationContext {
  country: string;
  city: string;
  culturalHints: string[];
}

export async function getLocationContext(): Promise<LocationContext | null> {
  // TODO: Implement in Context & Polish task
  return null;
}
