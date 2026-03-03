export default async function BiochemViewPage({ params }: { params: Promise<{ chem: string }> }) {
    const { chem } = await params;
    return <div>Biochemistry: {chem} — Coming Soon</div>;
}
