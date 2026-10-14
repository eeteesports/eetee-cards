import {cardBadges} from '../lib/cardBadges.mjs'
import styles from './CardBadges.module.css'

export default function CardBadges({card}) {
  const badges = cardBadges(card)
  if (!badges.length) return null
  return <div className={styles.badges} aria-label="Card features">{badges.map(badge => <span key={badge.label} className={styles.badge} title={badge.title} aria-label={badge.title}>{badge.label}</span>)}</div>
}
