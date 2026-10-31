import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 dakika (sekmeler arası geçişte anında önbellekten göster)
        gcTime: 1000 * 60 * 30, // 30 dakika önbellekte tut
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
