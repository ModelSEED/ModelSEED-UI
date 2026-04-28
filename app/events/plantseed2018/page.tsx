/**
 * PlantSEED 2018 Workshop page.
 * 
 * Displays workshop details, agenda, and downloadable materials for
 * the 2018 PlantSEED Metabolic Modeling Workshop held August 16-17, 2018.
 * 
 * @page /events/plantseed2018 - 2018 workshop details
 */

import React from 'react';
import { Container, Typography, Box, Link as MuiLink } from '@mui/material';
import Image from 'next/image';

export default function PlantSEED2018Page() {
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

            <Box display="flex" justifyContent="flex-end" mb={2}>
                <MuiLink
                    href="https://github.com/ModelSEED/PlantSEED/raw/master/Workshops/2018/PlantSEED_2018_Workshop_Brochure.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                    Download Workshop Brochure
                    <i className="icon-file-download text-muted"></i>
                </MuiLink>
            </Box>

            <Typography variant="h4" component="h2" align="center" gutterBottom>
                2018 PlantSEED Metabolic Modeling Workshop
            </Typography>

            <Typography variant="body1" paragraph>
                A two-day workshop on plant genome annotation, metabolic modeling, and reconstruction
                comprising formal lectures and hands-on instruction held at <b>Northwestern University, Evanston, IL
                    from the 16th to the 17th of August, 2018</b>. The workshop content is of interest to computational
                scientists associated to agriculture and biology departments as well as plant scientists interested in
                metabolic modeling including plant breeders, geneticists, physiologists and biochemists.
            </Typography>

            <Typography variant="h5" component="h3" align="center" gutterBottom sx={{ mt: 4 }}>
                Participants
            </Typography>

            <Box textAlign="center" mb={4}>
                <a href="http://bioseed.mcs.anl.gov/~seaver/Files/PlantSEED_Workshop_2018/PlantSEED_Workshop_2018_Participants.png" target="_blank" rel="noopener noreferrer">
                    <img
                        src="http://bioseed.mcs.anl.gov/~seaver/Files/PlantSEED_Workshop_2018/PlantSEED_Workshop_2018_Participants.png"
                        alt="2018 Workshop Group Photo"
                        style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                    />
                </a>
            </Box>

            <Box component="ul" sx={{ pl: 4, mb: 4 }}>
                <li>Chris Henry, Argonne National Laboratory, Co-PI, Faculty and Workshop Instructor</li>
                <li>Jose Gonzalez, South Dakota State Univesity, Faculty</li>
                <li>Robert Kleps, Morton Arboretum, Visiting Faculty</li>
                <li>Kathleen Beilsmith, University of Chicago, Graduate Student</li>
                <li>Crysten Blaby-Haas, Brookhaven National Laboratory, Faculty</li>
                <li>Caroline Oldstone-Moore, University of Chicago, Graduate Student</li>
                <li>Don McCarty, University of Florida, Co-PI and Faculty</li>
                <li>Rongkui Han, University of California, Davis, Graduate Student</li>
                <li>Zeeshan Banday, University of Chicago, Graduate Student</li>
                <li>Kateel Shetty, Flordia International University, Faculty</li>
                <li>Ian Blaby, Brookhaven National Laboratory, Faculty</li>
                <li>Megan Kennedy, University of Chicago, Graduate Student</li>
                <li>Sam Seaver, Argonne National Laboratory, Faculty and Workshop Instructor</li>
                <li>Feng Huang, University of Chicago, Graduate Student</li>
            </Box>

            <Typography variant="h5" component="h3" align="center" gutterBottom sx={{ mt: 4 }}>
                Program
            </Typography>

            <Typography variant="h6" component="h4" gutterBottom>
                <b>Day 1:</b> Flux Balance Analysis in PlantSEED
            </Typography>
            <Box component="ul" sx={{ pl: 4, mb: 3, listStyle: 'none' }}>
                <li>A. <MuiLink href="https://github.com/ModelSEED/PlantSEED/raw/master/Workshops/2018/Session_A_Overview.pptx">Overview</MuiLink>.</li>
                <li>B. <MuiLink href="https://github.com/ModelSEED/PlantSEED/raw/master/Workshops/2018/Session_B_Sandbox.pptx">Plastidial Sandbox Model</MuiLink>.</li>
                <li>C. <MuiLink href="https://github.com/ModelSEED/PlantSEED/raw/master/Workshops/2018/Session_C_FBA.pptx">Flux Balance Analysis</MuiLink>.</li>
                <li>D. <MuiLink href="https://github.com/ModelSEED/PlantSEED/raw/master/Workshops/2018/Session_D_tFBA.pptx">Transcript-constrained Flux Balance Analysis</MuiLink>.</li>
            </Box>

            <Typography variant="h6" component="h4" gutterBottom>
                <b>Day 2:</b> Annotation and Reconstruction in PlantSEED
            </Typography>
            <Box component="ul" sx={{ pl: 4, mb: 4, listStyle: 'none' }}>
                <li>E. <MuiLink href="https://github.com/ModelSEED/PlantSEED/raw/master/Workshops/2018/Session_E_Questions.pptx">Overview</MuiLink>.</li>
                <li>F. <MuiLink href="https://github.com/ModelSEED/PlantSEED/raw/master/Workshops/2018/Session_F_Annotation_and_Reconstruction.pptx">Annotation and Metabolic Reconstruction</MuiLink>.</li>
                <li>G. <MuiLink href="https://github.com/ModelSEED/PlantSEED/raw/master/Workshops/2018/Session_G_Future.pptx">Future of PlantSEED</MuiLink>.</li>
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
