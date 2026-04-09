/**
 * PlantSEED 2016 Workshop page.
 * 
 * Displays workshop details, agenda, and downloadable materials for
 * the 2016 PlantSEED Metabolic Modeling Workshop held August 4-5, 2016.
 * 
 * @page /events/plantseed2016 - 2016 workshop details
 */

import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import Image from 'next/image';

export default function PlantSEED2016Page() {
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
                2016 PlantSEED Metabolic Modeling Workshop
            </Typography>

            <Typography variant="body1" paragraph>
                A two-day workshop on plant genome annotation, metabolic modeling, and reconstruction
                comprising formal lectures and hands-on instruction held at <b>Northwestern University, Evanston, IL
                    from the 4th to the 5th of August, 2016</b>. The workshop content is of interest to computational
                scientists associated to agriculture and biology departments as well as plant scientists interested in
                metabolic modeling including plant breeders, geneticists, physiologists and biochemists.
            </Typography>

            <Typography variant="h5" component="h3" align="center" gutterBottom sx={{ mt: 4 }}>
                Participants
            </Typography>

            <Box textAlign="center" mb={4}>
                <a href="http://bioseed.mcs.anl.gov/~seaver/Files/PlantSEED_Workshop_2016/PlantSEED_Workshop_2016.jpg" target="_blank" rel="noopener noreferrer">
                    <img
                        src="http://bioseed.mcs.anl.gov/~seaver/Files/PlantSEED_Workshop_2016/PlantSEED_Workshop_2016.jpg"
                        alt="2016 Workshop Group Photo"
                        style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                    />
                </a>
            </Box>

            <Box component="ul" sx={{ pl: 4, mb: 4 }}>
                <li>Sam Seaver, Argonne National Laboratory, Faculty and Workshop Instructor</li>
                <li>Yang Shen, Texas A&M, Faculty</li>
                <li>Janaka Edirisinghe, Argonne National Laboratory, Faculty and Workshop Instructor</li>
                <li>Jiayi Sun, University of Florida, Post-doc</li>
                <li>Francisco Iacobelli, Northeastern Illinois University, Faculty</li>
                <li>Sunita Kumari, Cold Spring Harbor Laboratory, Faculty and Workshop Instructor</li>
                <li>Danielle Garceau, University of California, Riverside, Graduate Student</li>
                <li>Don McCarty, University of Florida, Co-PI and Faculty</li>
                <li>Elizabeth Fitzek, Northern Illinois University, Post-doc</li>
                <li>Joe Song, New Mexico State University, Faculty</li>
                <li>Amancio De Souza, University of California, Davis, Post-doc</li>
                <li>Patrick Thomas, University of California, Riverside, Graduate Student</li>
                <li>Neal Conrad, Argonne National Laboratory, Workshop Instructor</li>
                <li>David Still, California State Polytechnic University, Pomona, Faculty</li>
                <li>Ryan Fuller, University of Chicago, Graduate Student</li>
                <li>Chris Henry, Argonne National Laboratory, Co-PI, Faculty and Workshop Instructor</li>
                <li>Jose Faria, Argonne National Laboratory, Post-doc and Workshop Instructor</li>
            </Box>

            <Typography variant="h5" component="h3" align="center" gutterBottom sx={{ mt: 4 }}>
                Program
            </Typography>

            <Typography variant="h6" component="h4" gutterBottom>
                <b>Day 1:</b> Annotation and modeling of plant genomes in PlantSEED
            </Typography>
            <Box component="ul" sx={{ pl: 4, mb: 3, listStyle: 'none' }}>
                <li>A. Introduction to PlantSEED<br /></li>
                <li>B. Annotation of transcripts (Learn about signature k-mers and FIGFams)<br /></li>
                <li>C. View and Comparison of PlantSEED annotations<br /></li>
                <li>D. Introduction to metabolic modeling<br /></li>
                <li>E. Interactive Walkthrough of PlantSEED using Sandbox Model<br /></li>
            </Box>

            <Typography variant="h6" component="h4" gutterBottom>
                <b>Day 2:</b> Application of models to understand and discover plant biology
            </Typography>
            <Box component="ul" sx={{ pl: 4, mb: 4, listStyle: 'none' }}>
                <li>A. Demonstration of model applications with sandbox model<br /></li>
                <li>B. Question and answer session<br /></li>
                <li>C. Application of full genomes, transcriptomes, and models to answer biological questions<br /></li>
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
