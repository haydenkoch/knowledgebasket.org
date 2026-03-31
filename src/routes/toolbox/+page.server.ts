import { getPublishedResources } from '$lib/server/toolbox';

export async function load() {
	const toolbox = await getPublishedResources();
	return { toolbox };
}
