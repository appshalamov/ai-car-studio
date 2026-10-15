export function PageHead({ title, sub, badge }: { title: string; sub?: string; badge?: string }) {
  return (
    <header className="page-head">
      <h1>{title}{badge && <span className="badge">{badge}</span>}</h1>
      {sub && <p>{sub}</p>}
    </header>
  )
}
