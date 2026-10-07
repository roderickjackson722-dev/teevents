import bcgca from '@/assets/trust/bcgca.png.asset.json';
import sas from '@/assets/trust/sas-hbcu-invitational.png.asset.json';
import hall from '@/assets/trust/hall-of-fame.png.asset.json';
import arcis from '@/assets/trust/arcis-golf.png.asset.json';
import bridgestone from '@/assets/trust/bridgestone-hbcu.png.asset.json';
import mwm from '@/assets/trust/making-wishes-matter.png.asset.json';
import men from '@/assets/trust/100-black-men-phoenix.png.asset.json';

const logos = [
  { name: 'Black College Golf Coaches Association', image: bcgca.url, href: 'https://www.bcgca.org/' },
  { name: 'Arcis Golf', image: arcis.url, href: 'https://www.arcisgolf.com/' },
  { name: 'SAS HBCU Invitational', image: sas.url, href: 'https://www.sas.com/' },
  { name: 'Bridgestone HBCU Invitational', image: bridgestone.url, href: 'https://www.bridgestonegolf.com/' },
  { name: 'National Black College Alumni Hall of Fame', image: hall.url, href: 'https://www.nbcahof.org/' },
  { name: '100 Black Men of Phoenix', image: men.url, href: 'https://www.100blackmen.org/' },
  { name: 'Making Wishes Matter', image: mwm.url, href: undefined, dark: true },
];
const organizations = [
  ['Troon Golf', 'https://www.troon.com/'],
  ['Cleveland Golf', 'https://www.clevelandgolf.com/'],
  ['Golf Channel', 'https://www.golfchannel.com/'],
  ['PGA', 'https://www.pga.com/'],
  ['Octagon Management', 'https://www.octagon.com/'],
  ['Octagon', 'https://www.octagon.com/'],
];

export default function FounderPartners() {
  return <section className="founder-trust bg-background py-14 md:py-20 border-b border-border">
    <div className="container mx-auto px-4 max-w-6xl text-center">
      <h2 className="font-display text-3xl md:text-4xl text-primary font-bold">Trusted By Leaders in Golf</h2>
      <p className="text-muted-foreground mt-4 mb-10 max-w-2xl mx-auto">Organizations and events Roderick has worked with throughout his golf career — not necessarily current TeeVents platform clients.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8 items-center">
        {logos.map(logo => {
          const content = <><div className={`h-28 flex items-center justify-center px-4 rounded-md ${logo.dark ? 'bg-golf-green-dark' : ''}`}><img src={logo.image} alt={logo.name} loading="lazy" className="max-h-24 max-w-full object-contain grayscale opacity-85 transition duration-200 group-hover:grayscale-0 group-hover:opacity-100" /></div><p className="text-xs text-muted-foreground mt-3 leading-relaxed">{logo.name}</p></>;
          return logo.href ? <a className="group focus-visible:outline-2 focus-visible:outline-ring" key={logo.name} href={logo.href} target="_blank" rel="noopener noreferrer">{content}</a> : <div className="group" key={logo.name}>{content}</div>;
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mt-12 pt-8 border-t border-border">
        {organizations.map(([name, href]) => <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="font-display text-lg font-semibold text-muted-foreground hover:text-primary underline-offset-4 hover:underline">{name}</a>)}
      </div>
    </div>
  </section>;
}