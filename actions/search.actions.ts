"use server";

import * as searchService from "@/services/searchService";
import { requireSession } from "@/services/sessionService";

export type { GlobalSearchResults, SearchHit } from "@/services/searchService";

export async function globalSearchAction(query: string) {
  const session = await requireSession();
  return searchService.globalSearch(query, session);
}
