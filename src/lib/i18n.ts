import { createContext, useContext } from 'react'

export type Lang = 'en' | 'ru'

const plural = (n: number, one: string, few: string, many: string) => {
  const m = n % 10
  const c = n % 100
  return `${n} ${m === 1 && c !== 11 ? one : m >= 2 && m <= 4 && (c < 10 || c >= 20) ? few : many}`
}

export const T = {
  en: {
    before: 'Your photo', after: 'Your build',
    heroT: 'See your car in a new color and on new wheels',
    heroP: 'Upload a photo of your own car, pick a paint and wheels, and get a realistic picture in about 30 seconds. Before you pay for a single part.',
    ctaUpload: 'Upload your car', freeNote: (n: number) => `${n} free renders, no card needed`,
    howT: 'How it works',
    s1: 'Take a photo', s1p: 'Whole car in frame, side or three-quarter view, daylight works best.',
    s2: 'Pick a color and wheels', s2p: 'Start from a ready look, or choose paint, finish, wheels, stance and tint yourself.',
    s3: 'Compare and keep it', s3p: 'Drag across the photo to compare. Every build stays in your gallery and in the app.',
    startT: 'Popular styles',
    tuneT: 'Tune your car', tuneP: 'Start with a photo. Nothing is uploaded until you render.',
    addPhoto: 'Add a photo of your car', addPhotoP: 'Camera or photo library', sample: 'Try with a sample car',
    tip1: 'The whole car fits in the frame', tip2: 'Daylight or a bright garage', tip3: 'Side or three-quarter angle',
    yourCar: 'Your car', styles: 'Looks', parts: 'Parts',
    save: 'Save to gallery', saved: 'Saved to gallery', share: 'Share', more: 'Change more',
    galT: 'Gallery', render: 'Render build', tHome: 'Home', tTune: 'Tuning', tGal: 'Gallery',
    setT: 'Settings', langL: 'Language', done: 'Done', again: 'Tune again',
    del: 'Delete build', delQ: 'Delete this build?', keep: 'Keep', del2: 'Delete', deleted: 'Build deleted',
    paint: 'Paint', finish: 'Finish', wheels: 'Wheels', stance: 'Stance', tint: 'Window tint',
    none: 'Pick a look or change a part',
    changes: (n: number) => (n === 1 ? '1 change' : `${n} changes`),
    rendering: 'Rendering your build', renderLong: 'Almost there, good renders take a moment',
    builds: (n: number) => (n === 1 ? '1 build' : `${n} builds`),
    emptyT: 'No builds yet', emptyP: 'Your renders will show up here.', example: 'Example', today: 'Today',
    vN: (n: number) => `Version ${n}`,
    left: (n: number) => (n === 1 ? '1 free render left' : `${n} free renders left`),
    noneLeft: 'Free renders are used up',
    signT: 'Get your free renders', signP: (n: number, shop: string) => `${n} free renders of your own car. ${shop} may contact you about your build.`,
    name: 'Name', namePh: 'First name', phone: 'Phone', email: 'Email',
    signGo: 'Get free renders and render', signing: 'One moment',
    badPhone: 'Enter a phone number we can reach you on', badEmail: 'Enter a valid email',
    welcomeBack: 'Welcome back', readyT: 'Your build is ready', readyP: 'Open the app to compare it with your photo.',
    outT: 'You have used your free renders', outP: (shop: string) => `${shop} can render more builds for you and price the parts.`,
    call: 'Call the shop', sendShop: 'Send to the shop',
    account: 'Your account', signOut: 'Sign out on this phone',
    privacy: 'Your photo is sent only when you tap Render.',
    err: 'Could not render. Please try again.', busyT: 'Too many renders today. Please try again tomorrow.', offline: 'The service is not connected yet.',
    demo: 'Demo for auto businesses',
    examplesT: 'Examples', shopLine: 'Paint, wrap, wheels and tuning', callShort: 'Call',
    savePhotos: 'Save to Photos', inGallery: 'Saved in your gallery', newPhoto: 'New photo', custom: 'Custom build',
    pendingP: 'We will send a notification when it is ready.', galEmpty: 'Your builds will show up here. Meanwhile, see what others made.',
    pushAsk: 'Get a notification when your build is ready', pushGo: 'Turn on', pushOn: 'Notifications are on',
    inst: {
      title: (shop: string) => `Install the ${shop} app`,
      why: 'Your build arrives as a notification on your phone, and every build stays in the app. One tap from your home screen.',
      go: 'Install', later: 'Later',
      firstT: 'Your free renders are active', firstP: 'Your build is rendering now. Last step: install the app so the result reaches your phone.',
      iosT: 'On iPhone: 3 taps', ios1: 'Open this page in Safari', ios1other: 'Open this page in Safari or tap Share in the address bar',
      ios2: 'Tap Share (square with arrow)', ios3: 'Choose “Add to Home Screen”',
      andT: 'On Android: 2 taps', and1: 'Open the browser menu', and2: 'Choose “Install app” or “Add to Home screen”',
      done: 'The app is installed. Open it from your home screen.',
      banner: 'Install the app to get your builds as notifications',
      openBrowser: 'Open this link in Safari or Chrome to install the app',
      desktop: 'You are on a computer. Open this address on your phone to install the app:',
      desktopHint: 'In Chrome on a computer the app also installs from the icon at the right of the address bar.',
    },
    o: { silver: 'Silver', black: 'Black', white: 'White', red: 'Red', green: 'Green', grey: 'Grey', blue: 'Blue', yellow: 'Yellow', gloss: 'Gloss', satin: 'Satin', matte: 'Matte', w_silver: 'Silver', w_black: 'Black', w_bronze: 'Bronze', w_gold: 'Gold', w_graphite: 'Graphite', stock: 'Stock', lowered: 'Lowered', slammed: 'Slammed', clear: 'Clear', light: 'Light', dark: 'Dark' } as Record<string, string>,
  },
  ru: {
    before: 'Ваше фото', after: 'Ваша сборка',
    heroT: 'Посмотрите на свою машину в новом цвете и на новых дисках',
    heroP: 'Загрузите фото своей машины, выберите цвет и диски и примерно через 30 секунд получите реалистичную картинку. До того, как платить за детали.',
    ctaUpload: 'Загрузить машину', freeNote: (n: number) => `${plural(n, 'бесплатная сборка', 'бесплатные сборки', 'бесплатных сборок')}, без карты`,
    howT: 'Как это работает',
    s1: 'Сфотографируйте машину', s1p: 'Целиком в кадре, сбоку или в три четверти, лучше днём.',
    s2: 'Выберите цвет и диски', s2p: 'Начните с готового образа или подберите цвет, покрытие, диски, посадку и тонировку сами.',
    s3: 'Сравните и сохраните', s3p: 'Проведите по фото, чтобы сравнить. Все сборки остаются в галерее и в приложении.',
    startT: 'Популярные стили',
    tuneT: 'Тюнинг', tuneP: 'Начните с фото. Пока не нажмёте «Собрать», ничего не отправляется.',
    addPhoto: 'Добавить фото машины', addPhotoP: 'Камера или галерея телефона', sample: 'Попробовать на примере',
    tip1: 'Машина целиком в кадре', tip2: 'Дневной свет или светлый гараж', tip3: 'Сбоку или в три четверти',
    yourCar: 'Ваша машина', styles: 'Образы', parts: 'Детали',
    save: 'Сохранить в галерею', saved: 'Сохранено в галерею', share: 'Отправить', more: 'Доработать',
    galT: 'Галерея', render: 'Собрать', tHome: 'Главная', tTune: 'Тюнинг', tGal: 'Галерея',
    setT: 'Настройки', langL: 'Язык', done: 'Готово', again: 'Доработать',
    del: 'Удалить сборку', delQ: 'Удалить эту сборку?', keep: 'Оставить', del2: 'Удалить', deleted: 'Сборка удалена',
    paint: 'Цвет', finish: 'Покрытие', wheels: 'Диски', stance: 'Посадка', tint: 'Тонировка',
    none: 'Выберите образ или измените деталь',
    changes: (n: number) => plural(n, 'изменение', 'изменения', 'изменений'),
    rendering: 'Собираю машину', renderLong: 'Почти готово, хороший рендер занимает немного времени',
    builds: (n: number) => plural(n, 'сборка', 'сборки', 'сборок'),
    emptyT: 'Сборок пока нет', emptyP: 'Здесь появятся ваши рендеры.', example: 'Пример', today: 'Сегодня',
    vN: (n: number) => `Версия ${n}`,
    left: (n: number) => `Осталось: ${plural(n, 'бесплатная сборка', 'бесплатные сборки', 'бесплатных сборок')}`,
    noneLeft: 'Бесплатные сборки закончились',
    signT: 'Получите бесплатные сборки', signP: (n: number, shop: string) => `${plural(n, 'бесплатная сборка', 'бесплатные сборки', 'бесплатных сборок')} вашей машины. ${shop} может связаться с вами по сборке.`,
    name: 'Имя', namePh: 'Как к вам обращаться', phone: 'Телефон', email: 'Email',
    signGo: 'Получить и собрать', signing: 'Секунду',
    badPhone: 'Укажите телефон, по которому с вами можно связаться', badEmail: 'Укажите правильный email',
    welcomeBack: 'С возвращением', readyT: 'Сборка готова', readyP: 'Откройте приложение, чтобы сравнить с вашим фото.',
    outT: 'Бесплатные сборки закончились', outP: (shop: string) => `${shop} соберёт для вас ещё варианты и посчитает детали.`,
    call: 'Позвонить в сервис', sendShop: 'Отправить в сервис',
    account: 'Ваш аккаунт', signOut: 'Выйти на этом телефоне',
    privacy: 'Фото отправляется, только когда вы нажмёте «Собрать».',
    err: 'Не получилось собрать. Попробуйте ещё раз.', busyT: 'Сегодня слишком много сборок. Попробуйте завтра.', offline: 'Сервис ещё не подключён.',
    demo: 'Демо для автобизнеса',
    examplesT: 'Примеры', shopLine: 'Покраска, плёнка, диски и тюнинг', callShort: 'Позвонить',
    savePhotos: 'Сохранить в Фото', inGallery: 'Сохранено в галерее', newPhoto: 'Новое фото', custom: 'Своя сборка',
    pendingP: 'Пришлём уведомление, когда будет готово.', galEmpty: 'Здесь появятся ваши сборки. А пока посмотрите, что получилось у других.',
    pushAsk: 'Получать уведомление, когда сборка готова', pushGo: 'Включить', pushOn: 'Уведомления включены',
    inst: {
      title: (shop: string) => `Установите приложение ${shop}`,
      why: 'Готовая сборка придёт уведомлением на телефон, а все сборки останутся в приложении. Одно нажатие с экрана «Домой».',
      go: 'Установить', later: 'Позже',
      firstT: 'Бесплатные сборки активированы', firstP: 'Ваша сборка уже готовится. Последний шаг: установите приложение, чтобы результат пришёл на телефон.',
      iosT: 'На iPhone: 3 нажатия', ios1: 'Откройте эту страницу в Safari', ios1other: 'Откройте страницу в Safari или нажмите «Поделиться» в адресной строке',
      ios2: 'Нажмите «Поделиться» (квадрат со стрелкой)', ios3: 'Выберите «На экран “Домой”»',
      andT: 'На Android: 2 нажатия', and1: 'Откройте меню браузера', and2: 'Выберите «Установить приложение» или «Добавить на гл. экран»',
      done: 'Приложение установлено. Откройте его с экрана «Домой».',
      banner: 'Установите приложение, чтобы получать сборки уведомлением',
      openBrowser: 'Откройте эту ссылку в Safari или Chrome, чтобы установить приложение',
      desktop: 'Вы на компьютере. Откройте этот адрес на телефоне, чтобы установить приложение:',
      desktopHint: 'В Chrome на компьютере приложение ставится значком справа в адресной строке.',
    },
    o: { silver: 'Серебро', black: 'Чёрный', white: 'Белый', red: 'Красный', green: 'Зелёный', grey: 'Серый', blue: 'Синий', yellow: 'Жёлтый', gloss: 'Глянец', satin: 'Сатин', matte: 'Мат', w_silver: 'Серебро', w_black: 'Чёрные', w_bronze: 'Бронза', w_gold: 'Золото', w_graphite: 'Графит', stock: 'Заводская', lowered: 'Ниже', slammed: 'Низко', clear: 'Нет', light: 'Светлая', dark: 'Тёмная' } as Record<string, string>,
  },
} satisfies Record<Lang, unknown>

export type Dict = (typeof T)['en']

export function initialLang(): Lang {
  try {
    const l = localStorage.getItem('cs-lang')
    if (l === 'en' || l === 'ru') return l
  } catch { /* private mode */ }
  return 'en'
}

export const LangCtx = createContext<{ lang: Lang; t: Dict; setLang: (l: Lang) => void }>({ lang: 'en', t: T.en, setLang: () => {} })
export const useT = () => useContext(LangCtx)
