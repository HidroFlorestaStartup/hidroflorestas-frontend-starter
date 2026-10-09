// Ponto único de troca: substitua `mockApi` por uma implementação HTTP real na integração.
import { mockApi } from "./mock";
import type { HidroApi } from "./api";

export const api: HidroApi = mockApi;
export { ApiError, newIdempotencyKey } from "./api";
