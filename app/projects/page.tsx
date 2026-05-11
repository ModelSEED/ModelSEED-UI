/**
 * Projects hub page showcasing ModelSEED-related research and prototypes.
 * 
 * Links to external projects (KOMODO, MINE, Core Models) and internal
 * sub-projects (Regulons, Fusions) for metabolic pathway analysis.
 * 
 * @page /projects - Projects hub page
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './projects.module.css';

export const metadata: Metadata = {
    title: 'Projects - ModelSEED',
    description: 'ModelSEED Projects — a place to share research and results related to the ModelSEED resource.',
};

/**
 * Projects hub component displaying research project cards.
 * 
 * @returns JSX containing project listings with links
 */
export default function ProjectsPage() {
    return (
        <div className={styles.container}>
            <h3>ModelSEED Projects</h3>
            <hr className={styles.noMargin} />

            <div className={styles.intro}>
                <p>
                    ModelSEED Projects is place to share research and results
                    related to the ModelSEED resource.
                    Sometimes these tools are prototypes for future additions to the ModelSEED
                    or sometimes simply experiments worthy of a home.
                </p>
            </div>

            {/* Row 1: Fusions + KOMODO */}
            <div className={styles.projectRow}>
                <div>
                    <h4>
                        <Link href="/projects/fusions">
                            <span className={styles.newIcon}>✦</span>
                            Systematic Identification and Analysis of Frequent Fusion Events in Metabolic Pathways
                        </Link>
                    </h4>
                    <span>
                        Here you will find a work presented in the paper &quot;Systematic Identification and
                        Analysis of Frequent Fusion Events in Metabolic Pathways&quot;. (In review)
                    </span>
                </div>

                <div>
                    <h4>
                        <a href="http://komodo.modelseed.org" target="_blank" rel="noopener noreferrer">
                            <span className={styles.newIcon}>✦</span>
                            KOMODO - The Known Media Database
                        </a>
                    </h4>
                    <span>
                        KOMODO is a platform for recommending microbial media.
                        The project is led by our collaborator Raphy Zarecki.
                    </span>
                </div>
            </div>

            {/* Row 2: Regulons + MINE */}
            <div className={styles.projectRow}>
                <div className={styles.projectWithImage}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/img/projects/atomic-regulons.png"
                        alt="Atomic Regulons"
                        width={100}
                        height={100}
                    />
                    <div>
                        <h4>
                            <Link href="/projects/regulons">
                                <i>Bacillus subtilis​</i> Regulatory Network
                            </Link>
                        </h4>
                        <span>
                            View data presented in paper &quot;Reconstruction of the Regulatory Network for
                            Bacillus Subtilis and Reconciliation with Gene Expression Data&quot;.
                        </span>
                    </div>
                </div>

                <div className={styles.projectWithImage}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="https://minedatabase.mcs.anl.gov/img/Gold-Miner-Icon.png"
                        alt="MINE Database"
                        width={100}
                        height={100}
                    />
                    <div>
                        <h4>
                            <a href="http://minedatabase.mcs.anl.gov" target="_blank" rel="noopener noreferrer">
                                MINE: Metabolic In Silico Network Expansion Databases
                            </a>
                        </h4>
                        <span>
                            A collection of databases that expand the known metabolome using the BNICE framework
                            with hand-curated reaction rules.
                        </span>
                    </div>
                </div>
            </div>

            {/* Row 3: Core Models (single item) */}
            <div className={styles.projectRow}>
                <div>
                    <h4>
                        <a href="http://coremodels.mcs.anl.gov" target="_blank" rel="noopener noreferrer">
                            High Quality Central Carbon Core Metabolic Models
                        </a>
                    </h4>
                    <span>
                        Here you will find a work presented in the paper &quot;Modeling Central Metabolism
                        across Microbial Life&quot;. This work inspired a very primative version of the new
                        ModelSEED website.
                    </span>
                </div>
                <div>{/* Empty flex spacer for layout parity */}</div>
            </div>
        </div>
    );
}
