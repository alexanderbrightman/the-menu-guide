import {
  Inter,
  Roboto,
  Open_Sans,
  Lato,
  Montserrat,
  Oswald,
  Merriweather,
  Playfair_Display,
  Lora,
  Nunito,
  Poppins,
  Ubuntu,
  Dancing_Script,
  Pacifico,
  Abril_Fatface,
  Bebas_Neue,
  Lobster,
  Comfortaa,
} from 'next/font/google'

/**
 * Extra Google fonts for restaurant theme pickers. Imported only by the
 * dashboard so homepage visitors do not download 20 families they will
 * never use. Public menus load the one chosen family via a stylesheet link.
 *
 * preload: false — these are not the first paint of the marketing site.
 */
const inter = Inter({ variable: '--font-inter', subsets: ['latin'], preload: false, display: 'swap' })
const roboto = Roboto({ variable: '--font-roboto', subsets: ['latin'], weight: ['400', '500', '700'], preload: false, display: 'swap' })
const openSans = Open_Sans({ variable: '--font-open-sans', subsets: ['latin'], preload: false, display: 'swap' })
const lato = Lato({ variable: '--font-lato', subsets: ['latin'], weight: ['400', '700'], preload: false, display: 'swap' })
const montserrat = Montserrat({ variable: '--font-montserrat', subsets: ['latin'], preload: false, display: 'swap' })
const oswald = Oswald({ variable: '--font-oswald', subsets: ['latin'], preload: false, display: 'swap' })
const merriweather = Merriweather({ variable: '--font-merriweather', subsets: ['latin'], weight: ['400', '700'], preload: false, display: 'swap' })
const playfairDisplay = Playfair_Display({ variable: '--font-playfair-display', subsets: ['latin'], preload: false, display: 'swap' })
const lora = Lora({ variable: '--font-lora', subsets: ['latin'], preload: false, display: 'swap' })
const nunito = Nunito({ variable: '--font-nunito', subsets: ['latin'], preload: false, display: 'swap' })
const poppins = Poppins({ variable: '--font-poppins', subsets: ['latin'], weight: ['400', '600'], preload: false, display: 'swap' })
const ubuntu = Ubuntu({ variable: '--font-ubuntu', subsets: ['latin'], weight: ['400', '500', '700'], preload: false, display: 'swap' })
const dancingScript = Dancing_Script({ variable: '--font-dancing-script', subsets: ['latin'], preload: false, display: 'swap' })
const pacifico = Pacifico({ variable: '--font-pacifico', subsets: ['latin'], weight: ['400'], preload: false, display: 'swap' })
const abrilFatface = Abril_Fatface({ variable: '--font-abril-fatface', subsets: ['latin'], weight: ['400'], preload: false, display: 'swap' })
const bebasNeue = Bebas_Neue({ variable: '--font-bebas-neue', subsets: ['latin'], weight: ['400'], preload: false, display: 'swap' })
const lobster = Lobster({ variable: '--font-lobster', subsets: ['latin'], weight: ['400'], preload: false, display: 'swap' })
const comfortaa = Comfortaa({ variable: '--font-comfortaa', subsets: ['latin'], preload: false, display: 'swap' })

export const menuThemeFontClassName = [
  inter.variable,
  roboto.variable,
  openSans.variable,
  lato.variable,
  montserrat.variable,
  oswald.variable,
  merriweather.variable,
  playfairDisplay.variable,
  lora.variable,
  nunito.variable,
  poppins.variable,
  ubuntu.variable,
  dancingScript.variable,
  pacifico.variable,
  abrilFatface.variable,
  bebasNeue.variable,
  lobster.variable,
  comfortaa.variable,
].join(' ')
