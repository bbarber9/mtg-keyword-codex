import type { CodexRecord } from "../../actions/createCodex";
import styles from "./CodexPage.module.css";

interface CodexPageProps {
	codex: CodexRecord;
}

export function CodexPage({ codex }: CodexPageProps) {
	return (
		<section className={styles.page}>
			<header className={styles.header}>
				<p className={styles.eyebrow}>Codex</p>
				<h1 className={styles.title}>{codex.title}</h1>
				{codex.link ? (
					<p className={styles.metaRow}>
						<span className={styles.metaLabel}>Deck link</span>
						<a
							className={styles.link}
							href={codex.link}
							rel="noreferrer"
							target="_blank"
						>
							{codex.link}
						</a>
					</p>
				) : null}
				<p className={styles.metaRow}>
					<span className={styles.metaLabel}>Created</span>
					<time dateTime={codex.createdAt}>{formatTimestamp(codex.createdAt)}</time>
				</p>
			</header>

			{codex.primer ? (
				<section className={styles.card}>
					<h2 className={styles.sectionTitle}>Primer</h2>
					<p className={styles.primer}>{codex.primer}</p>
				</section>
			) : null}

			<section className={styles.card}>
				<div className={styles.sectionHeader}>
					<h2 className={styles.sectionTitle}>Keywords</h2>
					<span className={styles.badge}>{codex.keywords.length}</span>
				</div>
				{codex.keywords.length > 0 ? (
					<ul className={styles.keywordList}>
						{codex.keywords.map((keywordRecord) => (
							<li className={styles.keywordListItem} key={keywordRecord.keyword}>
								<span>{keywordRecord.keyword}</span>
								<span className={styles.keywordCount}>{keywordRecord.count}</span>
							</li>
						))}
					</ul>
				) : (
					<p className={styles.emptyState}>No keywords were found for this decklist.</p>
				)}
			</section>

			<section className={styles.card}>
				<h2 className={styles.sectionTitle}>Decklist</h2>
				<pre className={styles.decklist}>{codex.normalizedDecklist}</pre>
			</section>
		</section>
	);
}

export function CodexPageEmptyState() {
	return <p className={styles.emptyState}>Codex not found.</p>;
}

function formatTimestamp(timestamp: string): string {
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(timestamp));
}
