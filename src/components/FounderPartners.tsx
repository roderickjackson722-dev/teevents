import bcgca from '@/assets/trust/bcgca.png.asset.json';
import sas from '@/assets/trust/sas-hbcu-invitational.png.asset.json';
import hall from '@/assets/trust/hall-of-fame.png.asset.json';
import arcis from '@/assets/trust/arcis-golf.png.asset.json';
import bridgestone from '@/assets/trust/bridgestone-hbcu.png.asset.json';
import mwm from '@/assets/trust/making-wishes-matter.png.asset.json';
import men from '@/assets/trust/100-black-men-phoenix.png.asset.json';
import hbcuGolf from '@/assets/trust/hbcu-golf.png.asset.json';

const logos = [
  { name: 'Black College Golf Coaches Association', image: bcgca.url },
  { name: 'Arcis Golf', image: arcis.url },
  { name: 'SAS HBCU Invitational', image: sas.url },
  { name: 'Bridgestone HBCU Invitational', image: bridgestone.url },
  { name: 'National Black College Alumni Hall of Fame', image: hall.url },
  { name: '100 Black Men of Phoenix', image: men.url },
  { name: 'Making Wishes Matter', image: mwm.url, dark: true },
  { name: 'HBCU Golf', image: hbcuGolf.url },
];

export default function FounderPartners() {
  return <section className="founder-trust bg-background py-14 md:py-20 border-b border-border">
    <div className="container mx-auto px-4 max-w-6xl text-center">
      <h2 className="font-display text-3xl md:text-4xl text-primary font-bold">Trusted By Leaders in Golf</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8 items-center mt-12">
        {logos.map(logo => (
          <div className="group" key={logo.name}>
            <div className={`h-28 flex items-center justify-center px-4 rounded-md ${logo.dark ? 'bg-golf-green-dark' : ''}`}>
              <img src={logo.image} alt={logo.name} loading="lazy" className="max-h-24 max-w-full object-contain" />
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{logo.name}</p>
          </div>
        ))}
      </div>
    </div>
  </section>;
}
