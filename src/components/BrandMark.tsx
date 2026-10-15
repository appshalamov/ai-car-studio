import type { Brand } from '../lib/api'

/** The shop's square logo, or the neutral default mark until the owner uploads one. */
export function BrandMark({ brand, size = 32 }: { brand: Brand; size?: number }) {
  return <img className="mark" src={brand.logo || './favicon.svg'} alt="" width={size} height={size} />
}
