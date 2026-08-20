import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

/**
 * Cities are data, not code. The unit, the local word for the worker and the
 * union rate band all change from city to city — adding a city is a row, not a
 * release. Bands here are placeholders: they must be agreed with the local
 * union or board before a city goes live.
 */
const CITIES = [
  { name: 'Kolkata',   slug: 'kolkata',   unit: 'nag',   workerWord: 'Mutia',    langs: ['hi','bn','en'], bandLow: 28, bandHigh: 36,
    markets: ['Burrabazar','Posta','Mechua','Canning Street','Kalakar Street'] },
  { name: 'Delhi',     slug: 'delhi',     unit: 'nag',   workerWord: 'Palledar', langs: ['hi','en'],      bandLow: 30, bandHigh: 40,
    markets: ['Sadar Bazar','Chandni Chowk','Khari Baoli','Azadpur Mandi','Gandhi Nagar'] },
  { name: 'Mumbai',    slug: 'mumbai',    unit: 'piece', workerWord: 'Mathadi',  langs: ['hi','en'],      bandLow: 35, bandHigh: 48,
    markets: ['Masjid Bunder','Crawford Market','Vashi APMC','Dadar Market','Bhiwandi'] },
  { name: 'Ahmedabad', slug: 'ahmedabad', unit: 'nag',   workerWord: 'Hamal',    langs: ['hi','en'],      bandLow: 26, bandHigh: 34,
    markets: ['Kalupur','Panchkuva','Naroda','Jamalpur Market'] },
  { name: 'Surat',     slug: 'surat',     unit: 'than',  workerWord: 'Hamal',    langs: ['hi','en'],      bandLow: 30, bandHigh: 40,
    markets: ['Ring Road Textile Market','Sahara Darwaja','Udhna','Sachin GIDC'] },
];

async function main() {
  for (const c of CITIES) {
    const city = await db.city.upsert({
      where: { slug: c.slug },
      update: { unit: c.unit, workerWord: c.workerWord, langs: c.langs, bandLow: c.bandLow, bandHigh: c.bandHigh },
      create: { name: c.name, slug: c.slug, unit: c.unit, workerWord: c.workerWord, langs: c.langs, bandLow: c.bandLow, bandHigh: c.bandHigh },
    });
    for (const m of c.markets) {
      await db.market.upsert({
        where: { cityId_name: { cityId: city.id, name: m } },
        update: {},
        create: { cityId: city.id, name: m },
      });
    }
    console.log(`seeded ${c.name} with ${c.markets.length} markets`);
  }

  // one verified demo worker so the board is not empty on day one
  const kolkata = await db.city.findUniqueOrThrow({ where: { slug: 'kolkata' }, include: { markets: true } });
  const market = kolkata.markets[0]!;
  const user = await db.user.upsert({
    where: { phone: '919830144712' },
    update: {},
    create: { phone: '919830144712', name: 'Ramesh Sahni', role: 'WORKER', lang: 'hi', cityId: kolkata.id },
  });
  await db.workerProfile.upsert({
    where: { userId: user.id },
    update: { verify: 'VERIFIED' },
    create: {
      userId: user.id, code: '84217', trades: ['HEADLOAD', 'HANDCART'],
      marketId: market.id, verify: 'VERIFIED', verifiedAt: new Date(), interMarket: true,
    },
  });
  console.log('seeded demo worker 919830144712 (code 84217)');
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
