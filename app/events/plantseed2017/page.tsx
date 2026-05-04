/**
 * PlantSEED 2017 Workshop page.
 * 
 * Displays workshop details, agenda, and downloadable materials for
 * the 2017 PlantSEED Metabolic Modeling Workshop held August 17-18, 2017.
 * 
 * @page /events/plantseed2017 - 2017 workshop details
 */

import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import Image from 'next/image';

export default function PlantSEED2017Page() {
    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box textAlign="center" mb={4}>
                <Image
                    src="/img/plantseed-header.png"
                    alt="PlantSEED Workshop Logo"
                    width={800}
                    height={200}
                    style={{ maxWidth: '80%', height: 'auto', objectFit: 'contain' }}
                />
            </Box>

            <Typography variant="h4" component="h2" align="center" gutterBottom>
                2017 PlantSEED Metabolic Modeling Workshop
            </Typography>

            <Typography variant="body1" paragraph>
                A two-day workshop on plant genome annotation, metabolic modeling, and reconstruction
                comprising formal lectures and hands-on instruction held at <b>University of Florida, Gainesville, FL
                    from the 17th to the 18th of August, 2017</b>. The workshop content is of interest to computational
                scientists associated to agriculture and biology departments as well as plant scientists interested in
                metabolic modeling including plant breeders, geneticists, physiologists and biochemists.
            </Typography>

            <Typography variant="h5" component="h3" align="center" gutterBottom sx={{ mt: 4 }}>
                Participants
            </Typography>

            <Box textAlign="center" mb={4}>
                <a href="http://bioseed.mcs.anl.gov/~seaver/Files/PlantSEED_Workshop_2017/PlantSEED_Workshop_2017.png" target="_blank" rel="noopener noreferrer">
                    <Image
                        src="http://bioseed.mcs.anl.gov/~seaver/Files/PlantSEED_Workshop_2017/PlantSEED_Workshop_2017.png"
                        alt="2017 Workshop Group Photo"
                        width={800}
                        height={600}
                        style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                    />
                </a>
            </Box>

            <Box component="ul" sx={{ pl: 4, mb: 4 }}>
                <li>Jinfa Zhang, New Mexico State University, Faculty</li>
                <li>Claudia Lerma-Ortiz, University of Florida, Research Assistant</li>
                <li>Ivette Guzman, New Mexico State University, Faculty</li>
                <li>Sam Seaver, Argonne National Laboratory, Faculty and Workshop Instructor</li>
                <li>Barbara Muller, University of Florida, Graduate Student</li>
                <li>Shamsunnaher, University of Florida, Graduate Student</li>
                <li>Archana Sharma, Tuskegee University, Faculty</li>
                <li>Sandy Chavez, Texas A&M, Graduate Student</li>
                <li>Yasser Nehela, University of Florida, Graduate Student</li>
                <li>Scott Latimer, University of Florida, Graduate Student</li>
                <li>Zhao Yongli, Tuskegee University, Graduate Student</li>
                <li>Ahmed Omar Elhanafi, University of Florida, Post-doc</li>
                <li>Ann Bernert, University of Florida, Graduate Student</li>
                <li>Buskaran Kannan, University of Florida, Post-doc</li>
                <li>Daniel Blaine Marchant, University of Florida, Graduate Student</li>
                <li>Guohao He, Tuskegee University, Faculty</li>
                <li>Drake Garner, University of Florida, Graduate Student</li>
                <li>Madhurababu Kunta, Texas A&M, Faculty</li>
                <li>Tufan Mehmet Oz, University of Florida, Post-doc</li>
                <li>Dev Paudel, University of Florida, Graduate Student</li>
                <li>Don McCarty, University of Florida, Co-PI and Faculty</li>
                <li>Chris Henry, Argonne National Laboratory, Co-PI, Faculty and Workshop Instructor</li>
                <li>Quinton Allen, University of Florida, Graduate Student</li>
                <li>Fangfang Ma, University of Florida, Post-doc</li>
                <li>Ratna Karan, University of Florida, Post-doc</li>
                <li>Leslie Kollar, University of Florida, Graduate Student</li>
            </Box>

            <Typography variant="h5" component="h3" align="center" gutterBottom sx={{ mt: 4 }}>
                Program
            </Typography>

            <Typography variant="h6" component="h4" gutterBottom>
                <b>Day 1:</b> Flux Balance Analysis in PlantSEED
            </Typography>
            <Box component="ul" sx={{ pl: 4, mb: 3, listStyle: 'none' }}>
                <li>A. Overview.</li>
                <li>B. Plastidial Sandbox Model.</li>
                <li>C. Flux Balance Analysis.</li>
                <li>D. Transcript-constrained Flux Balance Analysis.</li>
            </Box>

            <Typography variant="h6" component="h4" gutterBottom>
                <b>Day 2:</b> Annotation and Reconstruction in PlantSEED
            </Typography>
            <Box component="ul" sx={{ pl: 4, mb: 4, listStyle: 'none' }}>
                <li>E. Overview.</li>
                <li>F. Annotation and Metabolic Reconstruction.</li>
                <li>G. Future of PlantSEED.</li>
            </Box>

            <Typography variant="h5" component="h3" align="center" gutterBottom sx={{ mt: 4 }}>
                Grant Support
            </Typography>

            <Typography variant="body1" paragraph>
                The <b>PlantSEED</b> resource was created with support by the National Science Foundation Grant IOS-1025398,
                by an endowment from the C. V. Griffin Sr. Foundation, and by the Office of Science, Office of Biological
                and Environmental Research, of the US Department of Energy (DOE) under Contract DE-ACO2-06CH11357, as part
                of the DOE Systems Biology Knowledgebase.
            </Typography>

            <Typography variant="body1" paragraph>
                The National Science Foundation Grant IOS-1444202 has provided support for both the improvement of the
                PlantSEED resource and the production of new modeling tools within ModelSEED to be able to annotate
                plant genomes using the PlantSEED platform and develop plant metabolism models. This grant also supports
                the implementation of four PlantSEED metabolic modeling workshops to train faculty, post-doctoral fellows
                and graduate students of American universities (with an emphasis on recruitment of faculty from minority
                serving institutions) in the use of these novel computational tools.
            </Typography>

            <Box mb={8} />
        </Container>
    );
}
