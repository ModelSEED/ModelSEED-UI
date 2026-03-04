import { redirect } from 'next/navigation';

/**
 * `/biochem/compounds/[id]` redirects to the canonical `/cpd/[id]` detail page.
 * This keeps the biochem sub-nav context while maintaining backwards-compatible permalinks.
 */
export default async function BiochemCompoundRedirect({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    redirect(`/cpd/${id}`);
}
