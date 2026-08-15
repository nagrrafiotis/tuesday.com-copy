import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			// Keep cached data fresh for 60s so tab switches / remounts don't hammer the API.
			staleTime: 60_000,
			refetchOnWindowFocus: false,
			// Don't retry rate-limited requests — retrying makes rate limiting worse.
			retry: false,
		},
		mutations: {
			retry: false,
		},
	},
});