/**
 * About ModelSEED landing page displaying project information and funding sources.
 * 
 * @page /about - Main about page
 */

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

/**
 * Main about page component displaying project description and funding info.
 * 
 * @returns JSX containing about content and funding sources
 */
export default function AboutPage() {
    return (
        <>
            <Box mb={4}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 400, color: '#333' }}>
                    About ModelSEED
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Typography variant="body1" sx={{ mb: 4, fontSize: '1.05rem', color: '#444' }}>
                    ModelSEED is a resource for the reconstruction, exploration,
                    comparison, and analysis of metabolic models.
                </Typography>
            </Box>

            <Box>
                <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, color: '#444' }}>
                    Sources Funding Development
                </Typography>

                <Typography variant="body1" paragraph fontStyle="italic" color="text.secondary">
                    This site and the tools and data hosted by it were developed and are maintained with support from the U.S. Department of Energy,
                    Office of Biological and Environmental Research; under contract DE-AC02-06CH11357 (<b>KBase project</b>)
                    and by the National Science Foundation under grant numbers PGRP-1025398 (for <b>PlantSEED</b>), MCB-1153357 (for <b>ModelSEED modeling</b>),
                    PGRP-1444202 (for <b>ModelSEED biochemistry</b>), and MCB-1611952 (for <b>ModelSEED modeling</b>).
                </Typography>

                <Typography variant="body1" paragraph fontStyle="italic" color="text.secondary">
                    The <b>ModelSEED</b> resource is based upon work supported by the
                    U.S. Department of Energy, Office of Biological and Environmental Research; under contract DE-AC02-06CH11357
                    and by the National Science Foundation grant number MCB-1153357.
                </Typography>

                <Typography variant="body1" paragraph fontStyle="italic" color="text.secondary">
                    The <b>PlantSEED</b> resource was created with support by the National Science Foundation Grant IOS-1025398, by an endowment from the C. V. Griffin Sr. Foundation, and by the Office of Science, Office of Biological and Environmental Research, of the US Department of Energy (DOE) under Contract DE-ACO2-06CH11357, as part of the DOE Systems Biology Knowledgebase.
                </Typography>

                <Typography variant="body1" paragraph fontStyle="italic" color="text.secondary">
                    The National Science Foundation Grant IOS-1444202 has provided support for both the improvement of the PlantSEED resource and the production of new modeling tools within ModelSEED to be able to annotate plant genomes using the PlantSEED platform and develop plant metabolism models. This grant also supports the implementation of four PlantSEED metabolic modeling workshops to train faculty, post-doctoral fellows and graduate students of American universities (with an emphasis on recruitment of faculty from minority serving institutions) in the use of these novel computational tools.
                </Typography>
            </Box>
        </>
    );
}
