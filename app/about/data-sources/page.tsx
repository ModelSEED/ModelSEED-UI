import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Link from '@mui/material/Link';

const DATA_SOURCES = [
    {
        data: 'Biochemical data (<a href="https://fairsharing.org/FAIRsharing.Ql6K87" target="_blank" rel="noreferrer">DOI</a>) and metabolic maps',
        sources: [
            { name: 'KEGG', url: 'https://www.genome.jp/kegg/' },
            { name: 'MetaCyc', url: 'https://metacyc.org/' },
            { name: 'PlantCyc', url: 'https://plantcyc.org/' },
            { name: 'Rhea', url: 'https://www.rhea-db.org/' }
        ]
    },
    {
        data: 'Genome annotations and subsystem data',
        sources: [
            { name: 'SEED', url: 'https://www.theseed.org/' },
            { name: 'RAST', url: 'https://rast.nmpdr.org/' },
            { name: 'MGRAST', url: 'https://www.mg-rast.org/' }
        ]
    },
    {
        data: 'Plant Genomes',
        sources: [
            { name: 'JGI Phytozome', url: 'https://phytozome.jgi.doe.gov/pz/portal.html' }
        ]
    },
    {
        data: 'Plant Gene Atlas<br/><sub>With thanks to Avinash Sreedasyam of <a href="https://hudsonalpha.org/" target="_blank" rel="noreferrer">HudsonAlpha</a></sub>',
        sources: [
            { name: 'JGI Gene Atlas', url: 'https://phytozome.jgi.doe.gov/phytomine/aspect.do?name=Expression' }
        ]
    }
];

export default function DataSourcesPage() {
    return (
        <>
            <Box mb={4}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 400, color: '#333' }}>
                    Data Sources
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Typography variant="body1" sx={{ mb: 4, color: '#444', lineHeight: 1.6 }}>
                    Much of the data included in the ModelSEED is derived from numerous
                    published manuscripts and databases. We&apos;ve done our best to cite contributing
                    data sources here. If you believe your data has been utilized and not properly
                    cited, please <Link href="mailto:help@modelseed.org">notify us</Link>. We sincerely thank all of our data
                    sources, without whom this resource would not exist.
                </Typography>
            </Box>

            <TableContainer component={Paper} elevation={0} variant="outlined">
                <Table sx={{ minWidth: 650 }} aria-label="data sources table">
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, width: '50%' }}>Data</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '50%' }}>Source</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {DATA_SOURCES.map((row, i) => (
                            <TableRow key={i} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell
                                    component="th"
                                    scope="row"
                                    dangerouslySetInnerHTML={{ __html: row.data }}
                                    sx={{ py: 2.5 }}
                                />
                                <TableCell sx={{ py: 2.5 }}>
                                    {row.sources.map((source, index) => (
                                        <span key={index}>
                                            <Link href={source.url} target="_blank" rel="noreferrer">
                                                {source.name}
                                            </Link>
                                            {index < row.sources.length - 1 ? ', ' : ''}
                                        </span>
                                    ))}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Typography variant="body2" sx={{ mt: 3, color: 'text.secondary', fontStyle: 'italic' }}>
                To be updated...
            </Typography>
        </>
    );
}
