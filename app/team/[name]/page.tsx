export default async function TeamMemberPage({ params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;
    return <div>Team Member: {name} — Coming Soon</div>;
}
