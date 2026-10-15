import { useLang } from '../lib/i18n'
import type { Brand } from '../lib/api'
import { IconCar } from './Icons'

export const brandName = (b: Brand, t: (ru: string, en: string) => string) => b.name.trim() || t('Ваша компания', 'Your company')

export function BrandMark({ brand }: { brand: Brand }) {
  const { t } = useLang()
  const named = !!brand.name.trim()
  return (
    <div className="brand">
      {brand.logo
        ? <img className="logo" src={brand.logo} alt="" />
        : <span className="logo ph" aria-hidden="true">{named ? brand.name.trim().charAt(0).toUpperCase() : <IconCar />}</span>}
      <div className="brand-t">
        <span className="word">{brandName(brand, t)}</span>
        {!named && <span className="demo">{t('Демо-версия для детейлинг-центров и кузовных сервисов', 'Demo for detailing and body shops')}</span>}
      </div>
    </div>
  )
}
