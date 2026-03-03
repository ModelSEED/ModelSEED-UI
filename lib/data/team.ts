/**
 * Team member data extracted from legacy app/views/docs/team.html.
 * Structured for iteration to maintain visual fidelity with the original layout.
 */

export interface TeamMember {
    name: string;
    url?: string;
    role?: string;
    affiliation: string;
    affiliationUrl?: string;
    imageSrc: string;
    imageWidth?: number;
    imageHeight?: number;
}

export interface TeamCategory {
    title: string;
    /** Use 'h3' for top-level sections, 'h4' for sub-sections */
    level: 'h3' | 'h4';
    members: TeamMember[];
}

export const TEAM_INTRO =
    'The ModelSEED is a collaboration between Henry Lab at Argonne National Laboratory and Nick Chia\'s team at Mayo Clinic.';

export const TEAM_DATA: TeamCategory[] = [
    {
        title: 'Principal Investigators',
        level: 'h3',
        members: [
            {
                name: 'Chris Henry',
                url: 'http://www.mcs.anl.gov/person/christopher-henry',
                role: 'Computational Biologist',
                affiliation: 'Argonne National Laboratory',
                imageSrc: '/img/team/chris-henry.jpg',
                imageWidth: 160,
                imageHeight: 160,
            },
            {
                name: 'Nicholas Chia',
                url: 'http://www.mayo.edu/research/faculty/chia-nicholas-ph-d/bio-20087464',
                role: 'Assistant Professor of Biophysics',
                affiliation: 'Center for Individualized Medicine Microbiome Program, Mayo Clinic',
                affiliationUrl:
                    'http://mayoresearch.mayo.edu/mayo/research/center-for-individualized-medicine/microbiome-program.asp',
                imageSrc: '/img/team/nick-chia.jpg',
                imageHeight: 160,
            },
        ],
    },
    {
        title: 'Partner Principal Investigators (PlantSEED)',
        level: 'h3',
        members: [
            {
                name: 'Andrew D Hanson',
                url: 'http://hos.ufl.edu/faculty/adhanson',
                role: 'C.V. Griffin Sr. Eminent Scholar',
                affiliation: 'Horticultural Sciences Department, University of Florida',
                imageSrc: '/img/team/andrew-hanson.png',
                imageWidth: 160,
            },
            {
                name: 'Donald R McCarty',
                url: 'http://hos.ufl.edu/faculty/drmccarty',
                role: 'Professor',
                affiliation: 'Horticultural Sciences Department, University of Florida',
                imageSrc: '/img/team/donald-mccarty.png',
                imageWidth: 160,
            },
        ],
    },
    {
        title: 'Scientists',
        level: 'h3',
        members: [
            {
                name: 'Matt DeJongh',
                url: 'http://www.hope.edu/cs/dejongh/',
                role: 'Professor of Computer Science',
                affiliation: 'Hope College',
                imageSrc: '/img/team/matt.jpg',
                imageHeight: 160,
            },
            {
                name: 'Samuel M. D. Seaver',
                url: 'http://www.mcs.anl.gov/person/samuel-m-d-seaver',
                role: 'Assistant Computational Scientist',
                affiliation: 'Argonne National Laboratory',
                imageSrc: '/img/team/sam.png',
                imageWidth: 160,
                imageHeight: 160,
            },
        ],
    },
    {
        title: 'PlantSEED Annotation',
        level: 'h4',
        members: [
            {
                name: 'Claudia Lerma-Ortiz',
                role: 'Scientist',
                affiliation: 'Horticultural Sciences Department, University of Florida',
                imageSrc: '/img/team/claudia-lerma-ortiz.png',
                imageWidth: 160,
            },
            {
                name: 'Svetlana Gerdes',
                role: 'Scientist',
                affiliation: 'Fellowship for Interpretation of Genomes',
                imageSrc: '/img/team/svetlana-gerdes.png',
                imageWidth: 160,
            },
        ],
    },
    {
        title: 'Post-Doctoral Researchers',
        level: 'h3',
        members: [
            {
                name: 'Janaka Edirisinghe',
                affiliation: 'Argonne National Laboratory',
                imageSrc: '/img/team/janaka.jpg',
                imageHeight: 160,
            },
            {
                name: 'José Faria',
                affiliation: 'Argonne National Laboratory',
                imageSrc: '/img/team/jose.jpeg',
                imageHeight: 160,
            },
            {
                name: 'M. Helena Mendes-Soares',
                affiliation: 'Mayo Clinic',
                imageSrc: '/img/team/lena.png',
                imageHeight: 160,
            },
            {
                name: 'Pamela Weisenhorn',
                affiliation: 'Argonne National Laboratory',
                imageSrc: '/img/team/pam.jpeg',
                imageHeight: 160,
            },
        ],
    },
    {
        title: 'Developers',
        level: 'h3',
        members: [
            {
                name: 'Neal Conrad',
                role: 'Software Engineering Associate (UI/UX)',
                affiliation: 'Argonne National Laboratory',
                imageSrc: '/img/team/neal.jpg',
                imageWidth: 160,
                imageHeight: 160,
            },
            {
                name: 'Michael Mundy',
                role: 'Senior Software Developer',
                affiliation: 'Center for Individualized Medicine Microbiome Program, Mayo Clinic',
                affiliationUrl:
                    'http://mayoresearch.mayo.edu/mayo/research/center-for-individualized-medicine/microbiome-program.asp',
                imageSrc: '/img/team/mike.png',
                imageHeight: 160,
            },
            {
                name: 'Arman Mikaili',
                role: 'Software Engineer',
                affiliation: 'Argonne National Laboratory',
                imageSrc: '/img/team/arman.jpg',
                imageWidth: 160,
                imageHeight: 160,
            },
        ],
    },
    {
        title: 'Graduate Students',
        level: 'h3',
        members: [
            {
                name: 'Cesar Cardona',
                affiliation: 'PhD Candidate in Biophysical Sciences at The University of Chicago',
                imageSrc: '/img/team/cesar.jpg',
                imageWidth: 196,
                imageHeight: 160,
            },
            {
                name: 'Charlie Seto',
                affiliation: 'Mayo Clinic',
                imageSrc: '/img/team/charlie.png',
                imageHeight: 160,
            },
        ],
    },
];
