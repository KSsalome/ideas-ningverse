import {z} from 'zod';

export const appearances={
 info:[['scroll','瓶中信']],
 outfit:[['forest-cape','斗篷'],['moon-coat','長外套'],['neon-jacket','機能夾克'],['six-hour-cape','六時序披風'],['neocity-coat','霓城外套'],['crystal-shawl','緋晶披肩'],['tavern-waistcoat','酒館背心']],
 hair:[['star-braid','長辮'],['ribbon-tails','雙髮束'],['muse-duotone','幻幕雙色短髮'],['archivist-part','藏書人側分']],
 prop:[['hand-lantern','提燈'],['traveler-book','手札'],['moon-staff','弦月手杖'],['sun-feather','彩羽胸飾'],['sun-pin','小太陽羽扣'],['film-camera','底片相機'],['paint-pouch','畫具腰包'],['reading-glasses','黃銅眼鏡'],['zero-card','第零張牌'],['brass-shaker','黃銅調飲器']],
} as const;
export const rarityNames={common:'普通',rare:'稀有',epic:'史詩',legendary:'傳說'} as const;
export const sourceNames={archipelago:'群島',home:'主島',technology:'科技島',art:'美術島',library:'圖書島',mine:'礦山島',tarot:'塔羅高塔',information:'INFORMATION FACTORY'} as const;
// `prop` remains the hand slot's stored key, so old hand-held equipment keeps working.
export const equipmentSlots=['hair','outfit','face','body','prop','effect'] as const;
export type EquipmentSlot=typeof equipmentSlots[number];
export const slotNames:Record<EquipmentSlot,string>={hair:'髮型',outfit:'服飾',face:'頭部與臉部',body:'胸前與腰部',prop:'手持配件',effect:'特殊效果'};
export const rewardSchema=z.object({
 id:z.string().regex(/^[\w-]{1,80}$/),type:z.enum(['info','outfit','hair','prop']),name:z.string().trim().min(1).max(80),description:z.string().max(12000),color:z.string().regex(/^#[0-9a-fA-F]{6}$/),
 appearance:z.enum(['scroll','forest-cape','moon-coat','neon-jacket','star-braid','ribbon-tails','hand-lantern','traveler-book','moon-staff','sun-feather','six-hour-cape','neocity-coat','crystal-shawl','tavern-waistcoat','muse-duotone','archivist-part','sun-pin','film-camera','paint-pouch','reading-glasses','zero-card','brass-shaker']),
 rarity:z.enum(['common','rare','epic','legendary']).default('common'),source:z.enum(['archipelago','home','technology','art','library','mine','tarot','information']).default('archipelago'),season:z.literal(1).optional(),number:z.number().int().min(1).max(999).optional(),
 enabled:z.boolean().default(true),weight:z.number().int().min(1).max(100).default(1),archived:z.boolean().default(false),updatedAt:z.string().optional(),
}).refine(r=>(appearances[r.type] as readonly (readonly string[])[]).some(([id])=>id===r.appearance),'外觀範本與收藏類型不符');
export type Reward=z.infer<typeof rewardSchema>;
export type Equipped=Record<EquipmentSlot,string|null>;
export const emptyEquipped:Equipped={outfit:null,hair:null,prop:null,face:null,body:null,effect:null};
const seeds=[
 {id:'lore-time',type:'info',name:'島嶼的六個清晨',description:'這座島的天空、建築與植被跟著臺北時間變化。換個時段來，也許會遇見另一種風景。',color:'#c9af80'},
 {id:'lore-castle',type:'info',name:'沒有對外開放的房間',description:'最高處的城堡保留給島主。不是每一段故事，都需要向世界展開。',color:'#af9cb8'},
 {id:'lore-buildings',type:'info',name:'正在長大的島',description:'作品有自己的建築，建築也有自己的成長。地基、鷹架與旗幟，記錄著還在進行的夢。',color:'#9ebba7'},
 {id:'forest-cape',type:'outfit',name:'森語斗篷',description:'一件帶著森林綠與黃銅扣的旅人斗篷。',color:'#698c76'},
 {id:'moon-coat',type:'outfit',name:'月白長外套',description:'把月光縫在衣角，留給還想多走一段路的旅人。',color:'#d1c7d6'},
 {id:'neon-jacket',type:'outfit',name:'霓光機能夾克',description:'袖口與衣襬帶著冷色光線的機能外套。',color:'#4c7084'},
 {id:'star-braid',type:'hair',name:'星垂長辮',description:'鬆鬆編起的長辮，繫著一枚小星扣。',color:'#a78eb6'},
 {id:'ribbon-tails',type:'hair',name:'雙結髮束',description:'兩側低低繫起的髮束，帶著細小緞帶。',color:'#b793aa'},
 {id:'hand-lantern',type:'prop',name:'掌心提燈',description:'一盞可以提在手上的小燈，陪你穿過夜色。',color:'#dfc38b'},
 {id:'traveler-book',type:'prop',name:'旅人手札',description:'把還沒說完的念頭，收進隨身的小冊子。',color:'#907c95'},
 {id:'moon-staff',type:'prop',name:'弦月手杖',description:'頂端嵌著弦月的小手杖，純粹為了好看。',color:'#b4b7ce'},
];
export const legacyRewards:Reward[]=seeds.map(r=>rewardSchema.parse({...r,appearance:r.type==='info'?'scroll':r.id}));
export const featherReward:Reward=rewardSchema.parse({id:'sun-conure-feather',type:'prop',name:'小雞的彩色羽毛',description:'小雞送來的一根彩色羽毛。可以配戴成胸飾，把今天相遇的光帶在身上。',color:'#dfad48',appearance:'sun-feather',enabled:false});
export const seasonOneTitle='遺落在群島的十二件珍藏';
export const seasonOneRewards:Reward[]=[
 {id:'s1-six-hour-cape',number:1,name:'六時序旅人披風',type:'outfit',source:'home',rarity:'rare',color:'#eee2c5',appearance:'six-hour-cape',description:'奶油白的短披風，星月金扣收住海風。內襯記得島上的六種天色，隨臺北時間悄悄換色。'},
 {id:'s1-sun-pin',number:2,name:'小太陽的羽扣',type:'prop',source:'home',rarity:'common',color:'#dfa63d',appearance:'sun-pin',description:'一枚黃橘與綠色的小羽扣，把小太陽的一點勇氣別在胸前，陪你走向下一座島。'},
 {id:'s1-neocity-coat',number:3,name:'霓城光軌外套',type:'outfit',source:'technology',rarity:'epic',color:'#161f29',appearance:'neocity-coat',description:'石墨黑的機能外套，青藍光軌縫在袖口與衣襬，像城市寫給夜行旅人的路標。'},
 {id:'s1-muse-duotone',number:4,name:'幻幕雙色髮',type:'hair',source:'art',rarity:'rare',color:'#bdbbc9',appearance:'muse-duotone',description:'銀灰與霧紫交錯的短髮，像展廳光影停在髮梢的一次溫柔變奏。'},
 {id:'s1-film-camera',number:5,name:'第七秒底片相機',type:'prop',source:'art',rarity:'rare',color:'#634631',appearance:'film-camera',description:'深棕皮革包覆的底片相機斜掛身側。留住快門後的第七秒，也留住來不及說的故事。'},
 {id:'s1-paint-pouch',number:6,name:'繆思畫具腰包',type:'prop',source:'art',rarity:'common',color:'#8a6547',appearance:'paint-pouch',description:'小腰包收著畫筆、調色盤與顏料，讓旅途中忽然出現的靈感，都有地方落筆。'},
 {id:'s1-archivist-part',number:7,name:'藏書人的髮型',type:'hair',source:'library',rarity:'common',color:'#51372c',appearance:'archivist-part',description:'整齊的栗棕側分短髮，帶著舊書頁與英倫學院的氣息，適合在窗邊讀完下一章。'},
 {id:'s1-reading-glasses',number:8,name:'午夜閱讀眼鏡',type:'prop',source:'library',rarity:'rare',color:'#b39659',appearance:'reading-glasses',description:'細黃銅圓框映著夜讀的燈。戴上它，看見字句之間仍未結束的小小世界。'},
 {id:'s1-crystal-shawl',number:9,name:'緋晶探礦披肩',type:'outfit',source:'mine',rarity:'rare',color:'#292730',appearance:'crystal-shawl',description:'深灰黑披肩藏著暗酒紅內襯，領口紅晶記錄礦山的回聲，陪你穿過溫暖礦燈。'},
 {id:'s1-zero-card',number:10,name:'無名的第零張牌',type:'prop',source:'tarot',rarity:'legendary',color:'#45305f',appearance:'zero-card',description:'沒有名字的第零張牌，深紫牌面繞著金邊。它在旅人身後緩慢浮動，留下淡紫色的微光。'},
 {id:'s1-tavern-waistcoat',number:11,name:'午夜酒館背心',type:'outfit',source:'information',rarity:'rare',color:'#493327',appearance:'tavern-waistcoat',description:'深咖啡背心搭配奶油白襯衫、古銅鈕扣與酒紅領結，適合在暖燈下聽一段新的情報。'},
 {id:'s1-brass-shaker',number:12,name:'黃銅調飲器',type:'prop',source:'information',rarity:'common',color:'#af8751',appearance:'brass-shaker',description:'一只握在手中的古銅調飲器，盛著酒館的暖光，也盛著下一次相遇的可能。'},
].map(r=>rewardSchema.parse({...r,season:1}));
export const rewards:Reward[]=[...legacyRewards,...seasonOneRewards];
export const defaultCatalog:Reward[]=[...legacyRewards,featherReward,...seasonOneRewards];
/** Saved catalog entries keep their identity and edits; new seeds only fill missing records/metadata. */
export function mergeRewardCatalog(saved:unknown[]):Reward[]{
 const raw=new Map(saved.map(value=>{const row=rewardSchema.parse(value);return[row.id,value as Record<string,unknown>];}));
 return [...rewards.map(seed=>rewardSchema.parse({...seed,...raw.get(seed.id)})),...saved.map(value=>rewardSchema.parse(value)).filter(row=>!rewards.some(seed=>seed.id===row.id)&&row.id!==featherReward.id)];
}
export function visibleRewardCatalog(catalog:Reward[],owned:ReadonlySet<string>):Reward[]{
 const rows=[...catalog.filter(r=>!r.archived||owned.has(r.id))];
 // Insert the daily feather after the original eleven records, not after this season.
 const firstNew=rows.findIndex(r=>!legacyRewards.some(old=>old.id===r.id));rows.splice(firstNew<0?rows.length:firstNew,0,featherReward);return rows;
}
export function slotForReward(item:Pick<Reward,'type'|'appearance'>):EquipmentSlot|null{
 if(item.type==='info')return null;if(item.type==='hair'||item.type==='outfit')return item.type;
 if(item.appearance==='reading-glasses')return'face';
 if(['sun-feather','sun-pin','film-camera','paint-pouch'].includes(item.appearance))return'body';
 if(item.appearance==='zero-card')return'effect';return'prop';
}
export function normalizeEquipment(raw:unknown,catalog:Reward[]=defaultCatalog,owned?:ReadonlySet<string>):Equipped{
 const result={...emptyEquipped},input=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 for(const slot of equipmentSlots){const id=input[slot],item=catalog.find(r=>r.id===id);if(item&&slotForReward(item)===slot&&(!owned||owned.has(item.id)))result[slot]=item.id;}
 // Migrate the former single accessory field without touching inventory or unlock rows.
 const legacy=catalog.find(r=>r.id===input.prop&&r.type==='prop'),slot=legacy&&slotForReward(legacy);
 if(legacy&&slot&&slot!=='prop'&&!result[slot]&&(!owned||owned.has(legacy.id)))result[slot]=legacy.id;
 return result;
}
const equipmentId=z.string().regex(/^[\w-]{1,80}$/).nullable().optional();
export const wardrobePatchSchema=z.object({outfit:equipmentId,hair:equipmentId,prop:equipmentId,face:equipmentId,body:equipmentId,effect:equipmentId}).strict();
export function applyEquipmentPatch(raw:unknown,patch:z.infer<typeof wardrobePatchSchema>,catalog:Reward[],owned:ReadonlySet<string>):Equipped{
 const result=normalizeEquipment(raw,catalog,owned);
 for(const slot of equipmentSlots){const id=patch[slot];if(id===undefined)continue;if(id===null){result[slot]=null;continue;}
  const item=catalog.find(r=>r.id===id),actual=item&&slotForReward(item);
  const legacy=slot==='prop'&&patch.body===undefined&&actual==='body';
  if(!item||!owned.has(id)||actual!==slot&&!legacy)throw new Error('403:尚未獲得這件收藏，或配戴位置不相符');
  result[legacy?'body':slot]=id;if(legacy)result.prop=null;
 }return result;
}
export type Cosmetics=Equipped&Partial<Record<`${EquipmentSlot}Color`,string>>;
export function resolveCosmetics(equipped:Partial<Equipped>,catalog:Reward[]=defaultCatalog):Cosmetics{
 const result:Cosmetics={...emptyEquipped};
 const normalized=normalizeEquipment(equipped,catalog);for(const slot of equipmentSlots){const item=catalog.find(r=>r.id===normalized[slot]);if(item){result[slot]=item.appearance;result[`${slot}Color`]=item.color;}}
 return result;
}
export function bottleRewardPool(catalog:Reward[],owned:ReadonlySet<string>,island:string):Reward[]{
 const eligible=catalog.filter(r=>r.enabled&&!r.archived&&!owned.has(r.id)&&(r.source==='archipelago'||(r.source==='tarot'?'mine':r.source)===island));
 const themed=eligible.filter(r=>r.source!=='archipelago');return themed.length?themed:eligible;
}
export function weightedReward(pool:Reward[],draw:number){const active=pool.filter(r=>r.enabled&&!r.archived),sum=active.reduce((n,r)=>n+r.weight,0);if(!sum)return null;let value=Math.max(0,Math.min(.999999999,draw))*sum;for(const r of active){value-=r.weight;if(value<0)return r;}return active.at(-1)!;}
