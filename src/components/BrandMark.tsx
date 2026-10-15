import type { Brand } from '../lib/api'

/** The shop's square logo, or a placeholder that says where the logo goes. */
export function BrandMark({ brand, size = 32 }: { brand: Brand; size?: number }) {
  if (brand.logo) return <img className="mark" src={brand.logo} alt="" width={size} height={size} />
  return <span className="mark ph" style={{ width: size, height: size }} aria-hidden="true">LOGO</span>
}
