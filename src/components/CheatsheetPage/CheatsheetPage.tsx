import type { CheatsheetRecord } from "../../actions/createCheatsheet";
import styles from "./CheatsheetPage.module.css";

interface CheatsheetPageProps {
	cheatsheet: CheatsheetRecord;
}

export function CheatsheetPage({ cheatsheet }: CheatsheetPageProps) {
	return (
		<section className={styles.page}>
			<header className={styles.header}>
				<p className={styles.eyebrow}>Cheatsheet</p>
				<h1 className={styles.title}>{cheatsheet.title}</h1>
				{cheatsheet.link ? (
					<p className={styles.metaRow}>
						<span className={styles.metaLabel}>Deck link</span>
						<a
							className={styles.link}
							href={cheatsheet.link}
							rel="noreferrer"
							target="_blank"
						>
							{cheatsheet.link}
						</a>
					</p>
				) : null}
				<p className={styles.metaRow}>
					<span className={styles.metaLabel}>Created</span>
					<time dateTime={cheatsheet.createdAt}>
						{formatTimestamp(cheatsheet.createdAt)}
					</time>
				</p>
			</header>

			{cheatsheet.primer ? (
				<section className={styles.card}>
					<h2 className={styles.sectionTitle}>Primer</h2>
					<p className={styles.primer}>{cheatsheet.primer}</p>
				</section>
			) : null}

			<section className={styles.card}>
				<div className={styles.sectionHeader}>
					<h2 className={styles.sectionTitle}>Keywords</h2>
					<span className={styles.badge}>{cheatsheet.keywords.length}</span>
				</div>
				{cheatsheet.keywords.length > 0 ? (
					<ul className={styles.keywordList}>
						{cheatsheet.keywords.map((keywordRecord) => (
							<li
								className={styles.keywordListItem}
								key={keywordRecord.keyword}
							>
								<span>{keywordRecord.keyword}</span>
								<span className={styles.keywordCount}>
									{keywordRecord.count}
								</span>
							</li>
						))}
					</ul>
				) : (
					<p className={styles.emptyState}>
						No keywords were found for this decklist.
					</p>
				)}
			</section>

			<section className={styles.card}>
				<h2 className={styles.sectionTitle}>Decklist</h2>
				<pre className={styles.decklist}>{cheatsheet.normalizedDecklist}</pre>
			</section>
		</section>
	);
}

export function CheatsheetPageEmptyState() {
	return <p className={styles.emptyState}>Cheatsheet not found.</p>;
}

function formatTimestamp(timestamp: string): string {
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(timestamp));
}
