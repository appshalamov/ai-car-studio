import { SERVICE_URL } from '../lib/service'
import { Link } from 'react-router-dom'
import { useLang } from '../lib/i18n'
import { starterThumb } from '../lib/starters'
import { BeforeAfter } from '../components/BeforeAfter'

export default function Home() {
  const { t } = useLang()
  const tools = [
    { to: '/car', icon: '🏎️', title: t('Тюнинг авто', 'Car Mods'), text: t('Диски, цвет, обвес, спойлеры, посадка — 17 категорий и 17 пресетов.', 'Wheels, paint, kits, wings, stance: 17 categories, 17 presets.') },
    { to: '/editor', icon: '🧽', title: t('Редактор фото', 'Photo Editor'), text: t('Уберите надписи, наклейки, номера и мусор с фото.', 'Remove writing, stickers, plates and clutter.') },
    { to: '/bike', icon: '🏍️', title: t('Тюнинг мото', 'Bike Mods'), text: t('Выхлоп, руль, пластик, колёса, покраска.', 'Exhausts, bars, fairings, wheels, paint.') },
    { to: '/backgrounds', icon: '🏢', title: t('Фоны для дилеров', 'Dealer Backgrounds'), text: t('До 20 фото за раз: студия, шоурум, площадка. Экспорт ZIP.', 'Up to 20 photos per batch. Studio, showroom, lot. ZIP export.') },
    { to: '/wrap', icon: '⚡', title: t('Винил для Tesla', 'Tesla Wraps'), text: t('Дизайн плёнки из фото или идеи + 3D-превью.', 'Wrap design from a photo or idea + 3D preview.'), badge: t('Новое', 'New') },
    { to: '/gallery', icon: '🖼️', title: t('Галерея', 'Gallery'), text: t('Все ваши сборки хранятся на устройстве.', 'All your builds, stored on device.') },
  ]
  const faq: [string, string][] = [
    [t('Что это за сервис?', 'What is this?'), t('AI-студия для автомобилистов и автобизнеса: превью тюнинга на фото своей машины, чистка фото и пакетная замена фонов для объявлений.', 'An AI studio for drivers and auto businesses: preview mods on your own car photo, clean photos, and batch-replace backgrounds for listings.')],
    [t('Это бесплатно?', 'Is it free?'), SERVICE_URL ? t('Да, генерация для вас бесплатна. В приложении видно, сколько стоит каждое фото для сервиса.', 'Yes, rendering is free for you. The app shows what each photo costs the service.') : t('Приложение бесплатно. Генерация идёт через ваш ключ Google Gemini (есть бесплатный лимит) или OpenAI — вы платите провайдеру напрямую по его тарифу.', 'The app is free. Rendering uses your own Google Gemini key (has a free tier) or OpenAI key, billed by the provider.')],
    [t('Где хранятся фото и ключи?', 'Where are photos and keys stored?'), SERVICE_URL ? t('История хранится только на вашем устройстве. Фото отправляются на генерацию через сервер сервиса и не сохраняются у нас.', 'History stays on your device. Photos go to rendering through the service server and are not kept by us.') : t('Только на вашем устройстве. Фото отправляются напрямую выбранному AI-провайдеру, без промежуточного сервера.', 'Only on your device. Photos go straight to the AI provider you chose, no middle server.')],
    [t('Как установить на телефон?', 'How do I install it?'), t('Android/Chrome: меню → «Установить приложение». iPhone/Safari: «Поделиться» → «На экран Домой». На компьютере — значок установки в адресной строке.', 'Android/Chrome: menu → Install app. iPhone/Safari: Share → Add to Home Screen. Desktop: the install icon in the address bar.')],
    [t('Сколько ждать результат?', 'How fast is it?'), t('Обычно 10–40 секунд на фото, зависит от модели и провайдера.', 'Usually 10–40 seconds per photo depending on model and provider.')],
    [t('Можно использовать в коммерции?', 'Commercial use?'), t('Результаты принадлежат вам; у вас должны быть права на загружаемые фото. Проверьте условия выбранного AI-провайдера.', 'You own the outputs; you need rights to your inputs. Check your AI provider terms.')],
  ]
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-text">
          <span className="pill">✨ {t('Готово за секунды · Устанавливается как приложение', 'Ready in seconds · Installable PWA')}</span>
          <h1>{t('Тюнингуйте машину мечты', 'Modify Your Dream Car')}</h1>
          <p>{t('Загрузите фото и посмотрите, как будут выглядеть новые диски, цвет, обвес и плёнка — ещё до покупки. А дилерам — чистые фото и студийные фоны для всего склада.', 'Upload a photo and preview new wheels, paint, kits and wraps before you buy. For dealers: clean photos and studio backgrounds for the whole lot.')}</p>
          <div className="row gap wrap">
            <Link className="btn primary big" to="/car">{t('Тюнинговать мою машину', 'Modify My Car')}</Link>
            <Link className="btn big" to="/backgrounds">{t('Решения для дилеров', 'Dealer Solutions')}</Link>
          </div>
        </div>
        <div className="hero-visual">
          <BeforeAfter before={starterThumb('coupe', '#9aa1a8')} after={starterThumb('coupe', '#ff6a13')} labels={[t('Сток', 'Stock'), t('Сборка', 'Build')]} />
        </div>
      </section>

      <section>
        <h2>{t('Инструменты', 'Tools')}</h2>
        <div className="grid tools">
          {tools.map((x) => (
            <Link key={x.to} to={x.to} className="card tool">
              <span className="tool-icon">{x.icon}</span>
              <b>{x.title}{x.badge && <span className="badge">{x.badge}</span>}</b>
              <span className="muted">{x.text}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="two">
        <div className="card pad">
          <h3>{t('Соберите до покупки', 'Build It Before You Buy It')}</h3>
          <p className="muted">{t('Сравнивайте диски, цвета и обвесы на фото своей машины. Складывайте доработки и сравнивайте версии.', 'Compare wheels, colors and kits on your own car. Stack mods and compare versions.')}</p>
          <Link to="/car" className="link">{t('Открыть тюнинг →', 'Try car mods →')}</Link>
        </div>
        <div className="card pad">
          <h3>{t('Продавайте склад быстрее', 'Sell Your Inventory Faster')}</h3>
          <p className="muted">{t('Единый студийный фон для всех объявлений, чистые стёкла без маркера, скрытые номера.', 'One consistent studio background for every listing, clean glass, hidden plates.')}</p>
          <Link to="/backgrounds" className="link">{t('Заменить фоны пакетом →', 'Batch backgrounds →')}</Link>
        </div>
      </section>

      <section>
        <h2>{t('Как это работает', 'How It Works')}</h2>
        <div className="grid steps">
          {[[t('Загрузите', 'Upload'), t('Фото авто или мото, лучше вид сбоку.', 'A car or bike photo, side view works best.')], [t('Измените', 'Modify'), t('Выберите пресет, детали, цвет или фон.', 'Pick a preset, parts, color or background.')], [t('Скачайте', 'Download'), t('Сохраните в высоком качестве или поделитесь.', 'Save in high-res or share.')]].map(([a, b], i) => (
            <div key={i} className="card pad step"><span className="num">{i + 1}</span><b>{a}</b><span className="muted">{b}</span></div>
          ))}
        </div>
      </section>

      <section className="stats">
        {[['100+', t('деталей и опций', 'parts & options')], ['<30 c', t('на одно фото', 'per photo')], [t('Фото-реализм', 'Photo-real'), t('с топовыми AI-моделями', 'with top AI models')], ['100%', t('результаты ваши', 'yours to keep')]].map(([a, b]) => (
          <div key={a} className="stat"><b>{a}</b><span>{b}</span></div>
        ))}
      </section>

      <section>
        <h2>{t('Для кого', 'Who It’s For')}</h2>
        <div className="grid tools">
          {[
            [t('Энтузиасты', 'Enthusiasts & modders'), t('Примерьте детали до покупки, без ошибок за тысячи долларов.', 'Try parts before you buy, avoid expensive mistakes.')],
            [t('Дилеры б/у авто', 'Used car dealers'), t('Единый стиль фото склада, быстрые объявления.', 'Consistent inventory photos, faster listings.')],
            [t('Студии оклейки', 'Wrap shops'), t('Показывайте клиенту плёнку на его машине до работы.', 'Show customers the wrap on their car before work.')],
            [t('Тюнинг-ателье', 'Mod shops'), t('Продавайте проекты визуализацией, а не словами.', 'Sell builds with visuals, not words.')],
          ].map(([a, b]) => <div key={a} className="card pad"><b>{a}</b><p className="muted">{b}</p></div>)}
        </div>
      </section>

      <section>
        <h2>FAQ</h2>
        <div className="faq">
          {faq.map(([q, a]) => (
            <details key={q} className="card"><summary>{q}</summary><p className="muted">{a}</p></details>
          ))}
        </div>
      </section>
    </div>
  )
}
