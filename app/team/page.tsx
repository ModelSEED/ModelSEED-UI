import type { Metadata } from 'next';
import { TEAM_DATA, TEAM_INTRO } from '@/lib/data/team';
import styles from './team.module.css';

export const metadata: Metadata = {
    title: 'Team - ModelSEED',
    description: 'Meet the ModelSEED team — a collaboration between Argonne National Laboratory and Mayo Clinic.',
};

export default function TeamPage() {
    return (
        <div className={styles.container}>
            <h3>ModelSEED Team</h3>
            <hr className={styles.noMargin} />
            <br />

            <p>{TEAM_INTRO}</p>

            {TEAM_DATA.map((category) => (
                <div key={category.title}>
                    {category.level === 'h3' ? (
                        <h3 className={styles.sectionTitle}>{category.title}</h3>
                    ) : (
                        <h4 className={styles.subSectionTitle}>{category.title}</h4>
                    )}

                    {category.members.map((member) => (
                        <div key={member.name} className={styles.teamMember}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={member.imageSrc}
                                alt={member.name}
                                width={member.imageWidth ?? undefined}
                                height={member.imageHeight ?? undefined}
                            />
                            <div>
                                <h4>
                                    {member.url ? (
                                        <a href={member.url} target="_blank" rel="noopener noreferrer">
                                            {member.name}
                                        </a>
                                    ) : (
                                        <span>{member.name}</span>
                                    )}
                                </h4>
                                {member.role && <i>{member.role}</i>}
                                {member.affiliationUrl ? (
                                    <a
                                        href={member.affiliationUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.affiliationLink}
                                    >
                                        {member.affiliation}
                                    </a>
                                ) : (
                                    <span>{member.affiliation}</span>
                                )}
                            </div>
                        </div>
                    ))}
                    <br />
                </div>
            ))}
        </div>
    );
}
