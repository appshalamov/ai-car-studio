import { useLang } from '../lib/i18n'
import { CAR_CATEGORIES, CAR_PRESETS } from '../lib/catalog'
import { ModStudio } from '../components/ModStudio'
import { PageHead } from '../components/PageHead'

export default function CarMods() {
  const { t } = useLang()
  return (
    <div className="page">
      <PageHead title={t('Тюнинг автомобиля', 'Car Modification')} sub={t('Загрузите фото или выберите стартовую машину, примените пресет или соберите свой набор доработок — и увидьте результат на своей машине.', 'Upload a photo or pick a starter car, apply a preset or build your own set of mods, and see it on your car.')} />
      <ModStudio tool="car" vehicle="car" categories={CAR_CATEGORIES} presets={CAR_PRESETS} withStarters />
    </div>
  )
}
