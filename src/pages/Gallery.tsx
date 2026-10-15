import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n'
import { clearHistory, deleteHistory, listHistory, type HistoryItem } from '../lib/db'
import { BeforeAfter } from '../components/BeforeAfter'
import { ResultActions } from '../components/ResultActions'
import { PageHead } from '../components/PageHead'

export default function Gallery() {
  const { t } = useLang()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [open, setOpen] = useState<HistoryItem | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const reload = () => listHistory().then(setItems)
  useEffect(() => { reload() }, [])
  const names: Record<string, string> = { all: t('Все', 'All'), car: t('Авто', 'Car'), bike: t('Мото', 'Bike'), editor: t('Редактор', 'Editor'), background: t('Фоны', 'Backgrounds'), wrap: t('Винил', 'Wraps') }
  const shown = items.filter((i) => filter === 'all' || i.tool === filter)
  return (
    <div className="page">
      <PageHead title={t('Галерея', 'Gallery')} sub={t('История генераций хранится только на этом устройстве.', 'Your render history, stored on this device only.')} />
      <div className="row between wrap gap">
        <div className="chips">
          {Object.keys(names).map((k) => <button key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{names[k]}</button>)}
        </div>
        {items.length > 0 && <button className="link" onClick={async () => { if (confirm(t('Удалить всю историю?', 'Delete all history?'))) { await clearHistory(); reload() } }}>{t('Очистить всё', 'Clear all')}</button>}
      </div>
      {open && (
        <div className="modal" onClick={() => setOpen(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            {open.before ? <BeforeAfter before={open.before} after={open.after} /> : <img src={open.after} alt="" />}
            <p className="muted small">{open.title}</p>
            <div className="row between wrap gap">
              <ResultActions image={open.after} name={open.tool} />
              <button className="btn ghost" onClick={async () => { await deleteHistory(open.id); setOpen(null); reload() }}>🗑 {t('Удалить', 'Delete')}</button>
            </div>
          </div>
        </div>
      )}
      {shown.length === 0 ? (
        <div className="empty muted">{t('Пока пусто. Сгенерируйте первую сборку!', 'Nothing yet. Render your first build!')}</div>
      ) : (
        <div className="grid gallery">
          {shown.map((i) => (
            <button key={i.id} className="card shot" onClick={() => setOpen(i)}>
              <img src={i.after} alt="" loading="lazy" />
              <span className="shot-meta"><span className="pill">{names[i.tool]}</span> {new Date(i.createdAt).toLocaleDateString()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
