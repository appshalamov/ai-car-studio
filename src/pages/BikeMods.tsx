import { useLang } from '../lib/i18n'
import { BIKE_CATEGORIES, BIKE_PRESETS } from '../lib/catalog'
import { ModStudio } from '../components/ModStudio'
import { PageHead } from '../components/PageHead'

export default function BikeMods() {
  const { t } = useLang()
  return (
    <div className="page">
      <PageHead title={t('Тюнинг мотоцикла', 'Motorcycle Modification')} sub={t('Выхлоп, руль, пластик, колёса и покраска — превью прямо на вашем байке.', 'Exhausts, bars, fairings, wheels and paint, previewed on your own bike.')} />
      <ModStudio tool="bike" vehicle="motorcycle" categories={BIKE_CATEGORIES} presets={BIKE_PRESETS} />
    </div>
  )
}
