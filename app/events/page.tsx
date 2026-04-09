'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './events.module.css';

export default function EventsPage() {
    const [expand, setExpand] = useState(false);

    return (
        <div className={styles.container}>
            <br />
            <h3>ModelSEED Related Events</h3>
            <hr className={styles.noMargin} />
            <br />

            <h4>Latest:</h4>

            <div className={styles.eventBlock}>
                <h4>
                    <Link href="/events/plantseed2018">
                        PlantSEED 2018 - The 2018 PlantSEED Metabolic Modeling Workshop
                    </Link>
                </h4>
                <div className={styles.dateMuted}>August 16th - 17th, 2018</div>
            </div>

            <div className={styles.eventBlock}>
                <h4>
                    <Link href="/events/plantseed2017">
                        PlantSEED 2017 - The 2017 PlantSEED Metabolic Modeling Workshop
                    </Link>
                </h4>
                <div className={styles.dateMuted}>August 17th - 18th, 2017</div>
            </div>

            <div className={styles.eventBlock}>
                <h4>
                    <Link href="/events/plantseed2016">
                        PlantSEED 2016 - The 2016 PlantSEED Metabolic Modeling Workshop
                    </Link>
                </h4>
                <div className={styles.dateMuted}>August 4th - 5th, 2016</div>
            </div>

            {/* Toggle past events */}
            <a
                className={styles.toggleLink}
                onClick={() => setExpand(!expand)}
            >
                {expand ? 'Hide' : 'View'} past events {expand ? '▲' : '▼'}
            </a>

            {expand && (
                <div className={styles.eventBlock}>
                    <br />
                    <h4>
                        <Link href="/events/plantseed2015">
                            PlantSEED 2015 - The 2015 PlantSEED Metabolic Modeling Workshop
                        </Link>
                    </h4>
                    <div className={styles.dateMuted}>August 13th - 14th, 2015</div>
                </div>
            )}
        </div>
    );
}
