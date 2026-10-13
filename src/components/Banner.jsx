export default function Banner({ banner }) {
  if (!banner) return null;
  return (
    <div className={`banner banner-${banner.tone}`} key={banner.key} role="status">
      <span className="banner-text">{banner.text}</span>
    </div>
  );
}
