export default async function ReactionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <div>Reaction: {id} — Coming Soon</div>;
}
