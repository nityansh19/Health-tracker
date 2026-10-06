export default function CreatorIntro() {
  return (
    <div className="creator-intro" role="presentation" aria-label="Made by Nityansh">
      <div className="creator-intro__ambient creator-intro__ambient--one" />
      <div className="creator-intro__ambient creator-intro__ambient--two" />

      <div className="creator-intro__content">
        <div className="creator-intro__mark" aria-hidden="true">
          <span className="creator-intro__ring creator-intro__ring--outer" />
          <span className="creator-intro__ring creator-intro__ring--inner" />
          <span className="creator-intro__logo">N</span>
          <span className="creator-intro__spark creator-intro__spark--one" />
          <span className="creator-intro__spark creator-intro__spark--two" />
        </div>

        <div className="creator-intro__credit">
          <span className="creator-intro__eyebrow">Made by</span>
          <span className="creator-intro__name">Nityansh</span>
        </div>

        <div className="creator-intro__line" />
        <p className="creator-intro__product">Health Tracker</p>
      </div>

      <p className="creator-intro__copyright">© 2026 Nityansh</p>
    </div>
  )
}
