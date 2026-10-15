import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useLang } from '../lib/i18n'
import { PageHead } from '../components/PageHead'

export default function Pricing() {
  const { t } = useLang()
  const [annual, setAnnual] = useState(false)
  const plans = [
    { name: 'Free', price: 0, feats: [t('Свой AI-ключ (Gemini / OpenAI)', 'Bring your own AI key'), t('Все инструменты', 'All tools'), t('История на устройстве', 'On-device history')], cta: t('Начать', 'Start'), to: '/car' },
    { name: 'Garage', price: 24, feats: [t('Генерации без своего ключа', 'Renders without your own key'), t('~240 рендеров в месяц', '~240 renders / month'), t('Коммерческая лицензия', 'Commercial license'), t('Приоритетная очередь', 'Priority queue')], cta: t('Скоро', 'Coming soon'), hot: true },
    { name: 'Dealer', price: 79, feats: [t('Пакетная обработка склада', 'Batch inventory processing'), t('Свои шоурумы и площадки', 'Custom showrooms & lots'), t('Командный доступ', 'Team seats'), t('API и интеграции с DMS', 'API & DMS integrations')], cta: t('Связаться', 'Contact us') },
  ]
  return (
    <div className="page">
      <PageHead title={t('Тарифы', 'Pricing')} sub={t('Сейчас приложение работает бесплатно с вашим собственным AI-ключом. Платные тарифы — витрина для будущего сервиса для автобизнеса США.', 'Today the app is free with your own AI key. Paid tiers are a showcase for the upcoming service for US auto businesses.')} />
      <div className="seg center">
        <button className={!annual ? 'on' : ''} onClick={() => setAnnual(false)}>{t('Помесячно', 'Monthly')}</button>
        <button className={annual ? 'on' : ''} onClick={() => setAnnual(true)}>{t('За год · 2 мес. в подарок', 'Annual · 2 months free')}</button>
      </div>
      <div className="grid plans">
        {plans.map((p) => (
          <div key={p.name} className={`card pad plan ${p.hot ? 'hot' : ''}`}>
            <b className="plan-name">{p.name}</b>
            <div className="price">${annual ? (p.price * 10 / 12).toFixed(2) : p.price.toFixed(2)}<small>/{t('мес', 'mo')}</small></div>
            <ul>{p.feats.map((f) => <li key={f}>✓ {f}</li>)}</ul>
            {p.to ? <Link className="btn primary" to={p.to}>{p.cta}</Link> : <button className="btn" disabled>{p.cta}</button>}
          </div>
        ))}
      </div>
    </div>
  )
}
