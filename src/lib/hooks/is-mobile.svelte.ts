import { browser } from '$app/environment';
import { MediaQuery } from 'svelte/reactivity';

const DEFAULT_MOBILE_BREAKPOINT = 768;

export class IsMobile {
	#mediaQuery: MediaQuery;
	#hydrated = $state(!browser);

	constructor(breakpoint: number = DEFAULT_MOBILE_BREAKPOINT) {
		this.#mediaQuery = new MediaQuery(`max-width: ${breakpoint - 1}px`, false);

		if (browser) {
			// Keep the first client render aligned with SSR to avoid mobile-only tree swaps
			// during hydration. After hydration, we can safely reveal the real media state.
			queueMicrotask(() => {
				this.#hydrated = true;
			});
		}
	}

	get current() {
		return this.#hydrated && this.#mediaQuery.current;
	}
}
