import { redirect } from 'next/navigation';

/**
 * `/biochem/reactions/[id]` redirects to the canonical `/rxn/[id]` detail page.
 * This keeps the biochem sub-nav context while maintaining backwards-compatible permalinks.
 */
export default async function BiochemReactionRedirect({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    redirect(`/rxn/${id}`);
}
