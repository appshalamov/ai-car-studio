import type { L } from './i18n'

export type Opt = L & { id: string; p: string; hex?: string }
export type Category = L & { id: string; icon: string; options: Opt[] }
export type Preset = L & { id: string; icon: string; desc: L; mods: string[] } // mods = "cat:opt"

const o = (id: string, ru: string, en: string, p?: string, hex?: string): Opt => ({ id, ru, en, p: p ?? en, hex })

export const PAINT_FINISHES: Opt[] = [
  o('gloss', 'Глянец', 'Gloss', 'high-gloss'),
  o('matte', 'Мат', 'Matte', 'flat matte'),
  o('satin', 'Сатин', 'Satin', 'satin'),
  o('metallic', 'Металлик', 'Metallic', 'metallic flake'),
  o('pearl', 'Перламутр', 'Pearl', 'pearlescent'),
  o('chrome', 'Хром', 'Chrome', 'mirror chrome'),
]

export const CAR_CATEGORIES: Category[] = [
  { id: 'paint', icon: '🎨', ru: 'Цвет кузова', en: 'Paint / Color', options: [
    o('black', 'Чёрный', 'Black', 'black', '#0f0f10'),
    o('white', 'Белый', 'White', 'pure white', '#f2f2f0'),
    o('nardo', 'Серый Нардо', 'Nardo Grey', 'Nardo grey', '#7d8084'),
    o('silver', 'Серебро', 'Silver', 'silver', '#c4c7cc'),
    o('red', 'Красный', 'Racing Red', 'racing red', '#c1121f'),
    o('orange', 'Оранжевый', 'Orange', 'bright orange', '#ff6a13'),
    o('yellow', 'Жёлтый', 'Yellow', 'vivid yellow', '#ffd000'),
    o('lime', 'Лайм', 'Lime', 'acid lime green', '#9be22d'),
    o('brg', 'Британский зелёный', 'British Racing Green', 'British racing green', '#0f3d2e'),
    o('blue', 'Синий', 'Blue', 'deep blue', '#1240ab'),
    o('baby', 'Голубой', 'Baby Blue', 'Gulf-style baby blue', '#8fc7e8'),
    o('purple', 'Фиолетовый', 'Purple', 'midnight purple', '#4b1d7a'),
    o('pink', 'Розовый', 'Pink', 'hot pink', '#ff4fa3'),
    o('gold', 'Золотой', 'Gold', 'champagne gold', '#c9a45c'),
    o('bronze', 'Бронза', 'Bronze', 'bronze', '#8c5a2b'),
    o('teal', 'Бирюзовый', 'Teal', 'teal', '#0f8a8a'),
  ] },
  { id: 'wheels', icon: '🛞', ru: 'Диски', en: 'Wheels', options: [
    o('5spoke-black', '5 спиц, чёрные', '5-spoke gloss black', 'gloss black 5-spoke 19-inch alloy wheels'),
    o('mesh-gold', 'Сетка, золото', 'Gold mesh', 'gold multi-spoke mesh wheels (BBS style)'),
    o('deepdish', 'Глубокий вылет', 'Deep dish', 'polished deep-dish split-rim wheels'),
    o('forged-bronze', 'Кованые, бронза', 'Forged bronze', 'bronze forged 6-spoke wheels'),
    o('te37', 'Спортивные 6 спиц', 'Track 6-spoke', 'white Japanese 6-spoke track wheels'),
    o('turbofan', 'Турбофан', 'Turbofan', 'aero turbofan wheel covers'),
    o('chrome', 'Хром 22"', 'Chrome 22"', 'large 22-inch chrome multi-spoke wheels'),
    o('beadlock', 'Бэдлок', 'Beadlock off-road', 'matte black beadlock off-road wheels'),
    o('wire', 'Спицованные', 'Wire wheels', 'chrome wire-spoke lowrider wheels'),
    o('steelies', 'Стальные', 'Steelies', 'black steel wheels with center caps'),
  ] },
  { id: 'suspension', icon: '⬇️', ru: 'Подвеска', en: 'Suspension', options: [
    o('lower', 'Занижение', 'Lowered', 'lowered by 40 mm on coilovers with perfect flush fitment'),
    o('slammed', 'Сильное занижение', 'Slammed', 'slammed on air suspension with wheels tucked into the arches'),
    o('camber', 'Развал', 'Negative camber', 'aggressive negative camber, stance style'),
    o('lift2', 'Лифт 2"', 'Lift 2"', 'lifted 2 inches'),
    o('lift4', 'Лифт 4"', 'Lift 4"', 'lifted 4 inches with long-travel suspension'),
  ] },
  { id: 'bodykit', icon: '🧩', ru: 'Обвес', en: 'Body Kit', options: [
    o('widebody', 'Широкий кузов', 'Widebody', 'bolt-on widebody kit with flared fenders'),
    o('lip', 'Губа бампера', 'Front lip', 'front lip splitter'),
    o('skirts', 'Пороги', 'Side skirts', 'aggressive side skirts'),
    o('diffuser', 'Диффузор', 'Rear diffuser', 'large rear diffuser'),
    o('bumper', 'Спорт-бампер', 'Sport bumper', 'aggressive sport front bumper with big intakes'),
    o('canards', 'Канарды', 'Canards', 'front bumper canards'),
    o('fullkit', 'Полный обвес', 'Full kit', 'full aero body kit: lip, skirts, diffuser'),
  ] },
  { id: 'spoiler', icon: '🪽', ru: 'Спойлер', en: 'Spoiler', options: [
    o('ducktail', 'Утиный хвост', 'Ducktail', 'ducktail spoiler'),
    o('lip', 'Лип-спойлер', 'Lip spoiler', 'subtle trunk lip spoiler'),
    o('gtwing', 'GT-антикрыло', 'GT wing', 'tall swan-neck GT wing'),
    o('carbon', 'Карбоновое крыло', 'Carbon wing', 'carbon fiber rear wing'),
    o('roof', 'Спойлер на крышу', 'Roof spoiler', 'roof spoiler'),
  ] },
  { id: 'wrap', icon: '🧻', ru: 'Плёнка', en: 'Wrap', options: [
    o('satin-black', 'Сатин чёрный', 'Satin black', 'satin black vinyl wrap'),
    o('chameleon', 'Хамелеон', 'Color-shift', 'color-shifting chameleon vinyl wrap (purple to green)'),
    o('camo', 'Камуфляж', 'Camo', 'digital camouflage vinyl wrap'),
    o('chrome', 'Хром-плёнка', 'Chrome wrap', 'chrome vinyl wrap'),
    o('twotone', 'Двухцвет', 'Two-tone', 'two-tone wrap with black roof and pillars'),
    o('ppf', 'Полиуретан (PPF)', 'Clear PPF', 'glossy clear paint protection film, deeper shine'),
  ] },
  { id: 'livery', icon: '🏁', ru: 'Ливрея / наклейки', en: 'Livery / Decals', options: [
    o('stripes', 'Гоночные полосы', 'Racing stripes', 'twin racing stripes over the hood and roof'),
    o('gulf', 'Ливрея Gulf', 'Gulf-style livery', 'heritage light-blue and orange racing livery'),
    o('martini', 'Ливрея Martini', 'Martini-style livery', 'heritage white livery with blue and red stripes'),
    o('number', 'Номер на двери', 'Race number', 'race number roundel on the doors'),
    o('side', 'Боковые полосы', 'Side stripes', 'side stripes along the doors'),
  ] },
  { id: 'carbon', icon: '◼️', ru: 'Карбон', en: 'Carbon Fiber', options: [
    o('hood', 'Карбоновый капот', 'Carbon hood', 'exposed carbon fiber hood'),
    o('roof', 'Карбоновая крыша', 'Carbon roof', 'exposed carbon fiber roof'),
    o('mirrors', 'Карбоновые зеркала', 'Carbon mirrors', 'carbon fiber mirror caps'),
    o('aero', 'Карбоновый аэро', 'Carbon aero', 'exposed carbon fiber aero parts'),
  ] },
  { id: 'lighting', icon: '💡', ru: 'Свет', en: 'Lighting', options: [
    o('halo', 'Ангельские глазки', 'Halo rings', 'LED halo headlights'),
    o('smoked', 'Тонированные фары', 'Smoked lights', 'smoked headlights and taillights'),
    o('yellow', 'Жёлтые противотуманки', 'Yellow fogs', 'selective yellow fog lights'),
    o('lightbar', 'LED-балка', 'Light bar', 'roof-mounted LED light bar'),
    o('underglow', 'Подсветка днища', 'Underglow', 'neon underglow lighting'),
  ] },
  { id: 'tint', icon: '🕶️', ru: 'Тонировка', en: 'Window Tint', options: [
    o('t35', 'Лёгкая 35%', 'Light 35%', '35% window tint'),
    o('t20', 'Средняя 20%', 'Medium 20%', '20% window tint'),
    o('t5', 'Лимузин 5%', 'Limo 5%', '5% limo window tint'),
  ] },
  { id: 'grille', icon: '🔲', ru: 'Решётка', en: 'Grille', options: [
    o('black', 'Чёрная решётка', 'Black grille', 'gloss black grille'),
    o('honeycomb', 'Соты', 'Honeycomb', 'honeycomb mesh grille'),
    o('chrome', 'Хром', 'Chrome grille', 'chrome grille'),
  ] },
  { id: 'hood', icon: '🚘', ru: 'Капот', en: 'Hood', options: [
    o('vented', 'С жабрами', 'Vented', 'vented performance hood'),
    o('scoop', 'Воздухозаборник', 'Hood scoop', 'hood scoop'),
    o('cowl', 'Cowl-induction', 'Cowl hood', 'cowl induction hood'),
  ] },
  { id: 'exhaust', icon: '💨', ru: 'Выхлоп', en: 'Exhaust', options: [
    o('quad', '4 трубы', 'Quad tips', 'quad exhaust tips'),
    o('titanium', 'Титановые насадки', 'Titanium tips', 'burnt titanium exhaust tips'),
    o('center', 'Центральный выхлоп', 'Center exit', 'center-exit exhaust'),
  ] },
  { id: 'calipers', icon: '🟥', ru: 'Суппорты', en: 'Calipers', options: [
    o('red', 'Красные', 'Red', 'red brake calipers', '#c1121f'),
    o('yellow', 'Жёлтые', 'Yellow', 'yellow brake calipers', '#ffd000'),
    o('blue', 'Синие', 'Blue', 'blue brake calipers', '#1240ab'),
    o('bbk', 'Большие тормоза', 'Big brake kit', 'big brake kit with 6-piston calipers and large drilled rotors'),
  ] },
  { id: 'blackout', icon: '⚫', ru: 'Антихром', en: 'Blackout', options: [
    o('trim', 'Чёрные молдинги', 'Black trim', 'all chrome trim blacked out'),
    o('badges', 'Чёрные шильдики', 'Black badges', 'black badges'),
    o('full', 'Полный антихром', 'Full blackout', 'full blackout package: trim, badges, grille, wheels'),
  ] },
  { id: 'overland', icon: '⛺', ru: 'Экспедиция', en: 'Overland', options: [
    o('rack', 'Багажник на крышу', 'Roof rack', 'roof rack platform'),
    o('tent', 'Палатка на крышу', 'Roof tent', 'rooftop tent'),
    o('bumper', 'Силовой бампер', 'Steel bumper', 'steel off-road bumper with winch'),
    o('snorkel', 'Шноркель', 'Snorkel', 'snorkel'),
    o('mt', 'Грязевая резина', 'Mud tires', 'aggressive mud-terrain tires'),
  ] },
  { id: 'plates', icon: '🔖', ru: 'Номера / шильды', en: 'Plates / Badges', options: [
    o('debadge', 'Убрать шильды', 'De-badge', 'remove all badges, clean look'),
    o('hideplate', 'Скрыть номер', 'Hide plate', 'blank plain license plate without characters'),
    o('jdm', 'Японский номер', 'JDM plate', 'Japanese-style license plate'),
  ] },
]

export const CAR_PRESETS: Preset[] = [
  { id: 'street', icon: '🛣️', ru: 'Стрит', en: 'Street', desc: { ru: 'Агрессивная посадка на каждый день', en: 'Daily-driven aggressive stance' }, mods: ['suspension:lower', 'wheels:5spoke-black', 'bodykit:lip', 'tint:t20'] },
  { id: 'track', icon: '🏎️', ru: 'Трек', en: 'Track', desc: { ru: 'Прижимная сила и время круга', en: 'Downforce, tuned for lap times' }, mods: ['bodykit:fullkit', 'spoiler:gtwing', 'wheels:te37', 'suspension:lower', 'calipers:bbk'] },
  { id: 'vip', icon: '🎩', ru: 'VIP', en: 'VIP', desc: { ru: 'Заниженный люкс на глубоких дисках', en: 'Slammed luxury, deep-dish wheels' }, mods: ['suspension:slammed', 'wheels:deepdish', 'tint:t5', 'paint:black'] },
  { id: 'offroad', icon: '🏔️', ru: 'Офф-роуд', en: 'Off-road', desc: { ru: 'Лифт и тяжёлая резина', en: 'Lifted with heavy tires' }, mods: ['suspension:lift4', 'wheels:beadlock', 'overland:mt', 'overland:bumper'] },
  { id: 'oem', icon: '✨', ru: 'OEM+', en: 'Clean OEM+', desc: { ru: 'Тонкая заводская доработка', en: 'Subtle factory-plus' }, mods: ['wheels:forged-bronze', 'suspension:lower', 'tint:t35'] },
  { id: 'widebody', icon: '↔️', ru: 'Широкий кузов', en: 'Widebody', desc: { ru: 'Полное расширение арок', en: 'Full overfender transformation' }, mods: ['bodykit:widebody', 'wheels:deepdish', 'suspension:lower', 'spoiler:ducktail'] },
  { id: 'jdm', icon: '🇯🇵', ru: 'JDM стэнс', en: 'JDM Stance', desc: { ru: 'Флаш, развал, натяжка', en: 'Flush fitment, camber, stretch' }, mods: ['suspension:camber', 'wheels:mesh-gold', 'plates:jdm', 'lighting:yellow'] },
  { id: 'rwb', icon: '🔩', ru: 'Porsche-стиль RWB', en: 'RWB Tribute', desc: { ru: 'Болтовые арки и высокое крыло', en: 'Bolted arches and tall wing' }, mods: ['bodykit:widebody', 'spoiler:gtwing', 'wheels:deepdish', 'suspension:slammed'] },
  { id: 'livery', icon: '🏁', ru: 'Гоночная ливрея', en: 'Motorsport Livery', desc: { ru: 'Классика автоспорта', en: 'Heritage racing livery' }, mods: ['livery:gulf', 'livery:number', 'wheels:te37', 'suspension:lower'] },
  { id: 'murdered', icon: '🖤', ru: 'Murdered-out', en: 'Murdered-out', desc: { ru: 'Всё чёрное и тонированное', en: 'All-black, smoked' }, mods: ['wrap:satin-black', 'blackout:full', 'tint:t5', 'lighting:smoked'] },
  { id: 'overland', icon: '⛺', ru: 'Оверленд', en: 'Overland', desc: { ru: 'Багажник, бампер, свет', en: 'Rack, bars, lights' }, mods: ['overland:rack', 'overland:tent', 'lighting:lightbar', 'suspension:lift2', 'overland:mt'] },
  { id: 'lowrider', icon: '🌴', ru: 'Лоурайдер', en: 'Lowrider', desc: { ru: 'Кэнди-покраска и спицы', en: 'Candy paint, wire wheels' }, mods: ['paint:purple', 'wheels:wire', 'suspension:slammed', 'livery:side'] },
  { id: 'carbon', icon: '◼️', ru: 'Карбон-трек', en: 'Carbon Track', desc: { ru: 'Открытый карбон и аэро', en: 'Exposed carbon and aero' }, mods: ['carbon:hood', 'carbon:roof', 'carbon:aero', 'spoiler:carbon'] },
  { id: 'timeattack', icon: '⏱️', ru: 'Тайм-аттак', en: 'Time Attack', desc: { ru: 'Экстремальное аэро', en: 'Extreme track aero' }, mods: ['bodykit:canards', 'bodykit:diffuser', 'spoiler:gtwing', 'carbon:aero', 'livery:number'] },
  { id: 'bagged', icon: '🎈', ru: 'Пневмо-стэнс', en: 'Bagged Stance', desc: { ru: 'Лёг на раму, глубокие диски', en: 'Laid frame, deep dish' }, mods: ['suspension:slammed', 'wheels:deepdish', 'suspension:camber'] },
  { id: 'hotrod', icon: '🔥', ru: 'Хот-род', en: 'Hot Rod', desc: { ru: 'Языки пламени и маслкар', en: 'Flames, classic muscle' }, mods: ['livery:stripes', 'hood:scoop', 'wheels:chrome', 'exhaust:quad'] },
  { id: 'itasha', icon: '🎌', ru: 'Итася', en: 'Itasha', desc: { ru: 'Аниме-ливрея и обвес', en: 'Anime livery, full dress-up' }, mods: ['livery:side', 'bodykit:fullkit', 'wheels:te37', 'plates:jdm'] },
]
// Itasha gets a dedicated custom prompt line too.
export const PRESET_EXTRA: Record<string, string> = {
  itasha: 'Japanese anime-style itasha vinyl livery with original colorful characters on the sides',
  hotrod: 'classic hot-rod flame graphics on the front fenders',
  lowrider: 'candy-coat paint with deep metallic flake',
}

export const BIKE_CATEGORIES: Category[] = [
  { id: 'paint', icon: '🎨', ru: 'Цвет', en: 'Paint', options: CAR_CATEGORIES[0].options },
  { id: 'exhaust', icon: '💨', ru: 'Выхлоп', en: 'Exhaust', options: [
    o('slipon', 'Слип-он карбон', 'Carbon slip-on', 'carbon fiber slip-on exhaust'),
    o('titanium', 'Титан', 'Titanium full system', 'burnt titanium full exhaust system'),
    o('underseat', 'Под сиденьем', 'Under-seat', 'under-seat twin exhaust'),
    o('drag', 'Драг-пайпы', 'Drag pipes', 'chrome drag pipes'),
  ] },
  { id: 'bars', icon: '🏍️', ru: 'Руль', en: 'Handlebars', options: [
    o('clipons', 'Клипоны', 'Clip-ons', 'low clip-on handlebars'),
    o('apehanger', 'Обезьяний руль', 'Ape hangers', 'tall ape hanger handlebars'),
    o('tracker', 'Трекер', 'Tracker bars', 'wide flat-track handlebars'),
  ] },
  { id: 'fairing', icon: '🛡️', ru: 'Пластик / обтекатель', en: 'Fairings', options: [
    o('race', 'Гоночный пластик', 'Race fairings', 'full race fairings'),
    o('cafe', 'Кафе-рейсер', 'Café fairing', 'café racer bikini fairing'),
    o('naked', 'Нейкед', 'Naked', 'remove fairings, naked streetfighter look'),
    o('bagger', 'Бэггер', 'Bagger', 'batwing fairing and hard saddlebags'),
  ] },
  { id: 'wheels', icon: '🛞', ru: 'Колёса', en: 'Wheels', options: [
    o('forged', 'Кованые', 'Forged', 'forged aluminum wheels'),
    o('spoked', 'Спицованные', 'Spoked', 'black spoked wheels'),
    o('carbon', 'Карбоновые', 'Carbon', 'carbon fiber wheels'),
    o('knobby', 'Эндуро-резина', 'Knobby tires', 'knobby dual-sport tires'),
  ] },
  { id: 'seat', icon: '💺', ru: 'Сиденье', en: 'Seat', options: [
    o('solo', 'Соло', 'Solo seat', 'solo brown leather seat'),
    o('cowl', 'Горб', 'Seat cowl', 'single seat cowl'),
    o('diamond', 'Ромб', 'Diamond stitch', 'diamond-stitched seat'),
  ] },
  { id: 'lighting', icon: '💡', ru: 'Свет', en: 'Lighting', options: [
    o('round', 'Круглая фара', 'Round headlight', 'round LED headlight'),
    o('quad', 'Четыре фары', 'Quad lights', 'quad LED headlights'),
    o('tail', 'Интегрированный стоп', 'Integrated tail', 'integrated LED tail light, tidy tail'),
  ] },
  { id: 'livery', icon: '🏁', ru: 'Графика', en: 'Graphics', options: [
    o('racing', 'Гоночная', 'Race graphics', 'racing graphics with number'),
    o('stripes', 'Полосы', 'Stripes', 'center stripes on tank'),
    o('flames', 'Пламя', 'Flames', 'flame graphics on tank'),
  ] },
]

export const BIKE_PRESETS: Preset[] = [
  { id: 'cafe', icon: '☕', ru: 'Кафе-рейсер', en: 'Café Racer', desc: { ru: 'Клипоны, горб, круглая фара', en: 'Clip-ons, cowl, round light' }, mods: ['bars:clipons', 'seat:cowl', 'lighting:round', 'fairing:cafe'] },
  { id: 'scrambler', icon: '🏜️', ru: 'Скрэмблер', en: 'Scrambler', desc: { ru: 'Широкий руль и эндуро-резина', en: 'Wide bars, knobbies' }, mods: ['bars:tracker', 'wheels:knobby', 'seat:solo'] },
  { id: 'chopper', icon: '🦅', ru: 'Чоппер', en: 'Chopper', desc: { ru: 'Обезьяний руль и пламя', en: 'Apes and flames' }, mods: ['bars:apehanger', 'livery:flames', 'exhaust:drag'] },
  { id: 'race', icon: '🏁', ru: 'Гоночный', en: 'Race Rep', desc: { ru: 'Пластик, карбон, титан', en: 'Fairings, carbon, titanium' }, mods: ['fairing:race', 'wheels:carbon', 'exhaust:titanium', 'livery:racing'] },
  { id: 'streetfighter', icon: '👊', ru: 'Стритфайтер', en: 'Streetfighter', desc: { ru: 'Нейкед и четыре фары', en: 'Naked, quad lights' }, mods: ['fairing:naked', 'lighting:quad', 'exhaust:slipon'] },
  { id: 'bagger', icon: '🧳', ru: 'Бэггер', en: 'Bagger', desc: { ru: 'Обтекатель и кофры', en: 'Batwing and bags' }, mods: ['fairing:bagger', 'paint:black', 'exhaust:drag'] },
]

export type Scene = L & { id: string; p: string; demo: [string, string] }
export const SCENES: Scene[] = [
  { id: 'studio', ru: 'Серая студия', en: 'Studio grey', p: 'a seamless neutral grey photo studio with soft even lighting and a subtle floor reflection', demo: ['#d9dbde', '#8f9399'] },
  { id: 'dark', ru: 'Тёмный шоурум', en: 'Dark showroom', p: 'a dark premium car showroom with polished black floor and dramatic spotlights', demo: ['#24262b', '#07080a'] },
  { id: 'bright', ru: 'Светлый шоурум', en: 'Bright showroom', p: 'a bright modern car dealership showroom with glass walls and white glossy floor', demo: ['#ffffff', '#cfd6dd'] },
  { id: 'industrial', ru: 'Индустриальная студия', en: 'Industrial studio', p: 'an industrial loft studio with concrete floor, brick walls and warm lighting', demo: ['#8a7b6d', '#3c342e'] },
  { id: 'lot', ru: 'Площадка дилера', en: 'Outdoor dealership', p: 'a clean outdoor car dealership lot on a sunny day with blue sky', demo: ['#7cc2ff', '#b7b2a6'] },
  { id: 'city', ru: 'Город ночью', en: 'City night', p: 'a modern city street at night with neon reflections on wet asphalt', demo: ['#1b1440', '#0a0a12'] },
  { id: 'mountain', ru: 'Горная дорога', en: 'Mountain road', p: 'a scenic mountain road at golden hour', demo: ['#f6b26b', '#5a6b4a'] },
  { id: 'coast', ru: 'Побережье', en: 'Coastal highway', p: 'a coastal highway by the ocean at sunset', demo: ['#ff9e6d', '#2a6f97'] },
]

export const EDITOR_FIXES: Opt[] = [
  o('stickers', 'Наклейки и надписи на стёклах', 'Windshield writing & stickers', 'remove all stickers, price writing and markings on the windows and windshield'),
  o('plates', 'Скрыть номер', 'Hide license plate', 'replace the license plate with a clean blank plate'),
  o('dealer', 'Рамки и логотипы дилера', 'Dealer frames & logos', 'remove dealer plate frames and dealer logos'),
  o('dirt', 'Грязь и пыль', 'Dirt & dust', 'make the car look freshly washed and detailed, remove dirt and dust'),
  o('scratches', 'Мелкие царапины', 'Minor scratches', 'remove minor scratches and swirl marks'),
  o('reflections', 'Отражения людей', 'People in reflections', 'remove reflections of people and the photographer from the paint and glass'),
  o('people', 'Люди и объекты на фоне', 'Background people & clutter', 'remove people, cones, signs and clutter around the car'),
  o('cones', 'Ценники и шары', 'Price tags & balloons', 'remove price tags, balloons and promotional items'),
  o('light', 'Улучшить свет и цвет', 'Fix lighting & color', 'correct exposure, white balance and color to look like a professional photo'),
]

export type Starter = L & { id: string; kind: string; color: string }
export const STARTERS: Starter[] = [
  { id: 'coupe', ru: 'Спорт-купе', en: 'Sport Coupe', kind: 'coupe', color: '#d7263d' },
  { id: 'sedan', ru: 'Бизнес-седан', en: 'Executive Sedan', kind: 'sedan', color: '#1b263b' },
  { id: 'suv', ru: 'Кроссовер', en: 'Crossover SUV', kind: 'suv', color: '#e0e1dd' },
  { id: 'hatch', ru: 'Хот-хэтч', en: 'Hot Hatch', kind: 'hatch', color: '#1f7ae0' },
  { id: 'pickup', ru: 'Пикап', en: 'Pickup Truck', kind: 'pickup', color: '#3a3a3a' },
  { id: 'roadster', ru: 'Родстер', en: 'Convertible Roadster', kind: 'roadster', color: '#f4d35e' },
  { id: 'wagon', ru: 'Универсал', en: 'Touring Wagon', kind: 'wagon', color: '#5c6b73' },
  { id: 'muscle', ru: 'Маслкар', en: 'Muscle Car', kind: 'muscle', color: '#ff7a00' },
]

export function findOpt(cats: Category[], key: string) {
  const [c, id] = key.split(':')
  const cat = cats.find((x) => x.id === c)
  const opt = cat?.options.find((x) => x.id === id)
  return cat && opt ? { cat, opt } : null
}
