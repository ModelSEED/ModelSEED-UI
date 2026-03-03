export default async function CompoundPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <div>Compound: {id} — Coming Soon</div>;
}
