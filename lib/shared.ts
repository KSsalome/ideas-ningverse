import { z } from 'zod';
import {shapeIds} from './building-appearance.ts';
export type Phase = 'wonder'|'forest'|'medieval'|'industrial'|'cyber'|'gothic';
export const phases: Record<Phase,{name:string;subtitle:string;range:string;accent:string;sky:string;water:string;land:string;wall:string;roof:string;light:string}> = {
 wonder:{name:'曦光',subtitle:'晨霧散開，故事正要甦醒。',range:'04:00—08:00',accent:'#d7b87c',sky:'#67768e',water:'#52647f',land:'#b5bba6',wall:'#eee5d4',roof:'#4b506f',light:'#ffe9be'},
 forest:{name:'森語',subtitle:'那就把想像種進森林，等待它慢慢發芽。',range:'08:00—11:00',accent:'#c4ac70',sky:'#526779',water:'#455f70',land:'#9aa98e',wall:'#e8e3cc',roof:'#344b58',light:'#ffedb9'},
 medieval:{name:'日光',subtitle:'早安，我的朋。',range:'11:00—14:00',accent:'#d6b576',sky:'#536278',water:'#42576f',land:'#b8b39d',wall:'#efe3ce',roof:'#344563',light:'#ffe6ad'},
 industrial:{name:'銅色',subtitle:'現在適合來一個雷霆瞌睡。',range:'14:00—17:00',accent:'#c9a368',sky:'#344258',water:'#34475f',land:'#b0aa98',wall:'#e8dcc6',roof:'#263b5c',light:'#ffe1a1'},
 cyber:{name:'霓光',subtitle:'入夜之後，未完成的夢也會發光。',range:'17:00—23:00',accent:'#c9b381',sky:'#17283f',water:'#1e3651',land:'#939faf',wall:'#d8dce0',roof:'#203858',light:'#b6eaff'},
 gothic:{name:'夜薔',subtitle:'萬物安靜下來，Eight來Eight好玩。',range:'23:00—04:00',accent:'#bd9f74',sky:'#161d32',water:'#27304a',land:'#928f9b',wall:'#c5bfc1',roof:'#292b48',light:'#ffda9c'},
};
export function phaseAt(date=new Date()): Phase {
 const h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Taipei',hour:'2-digit',hourCycle:'h23'}).format(date));
 return h>=4&&h<8?'wonder':h>=8&&h<11?'forest':h>=11&&h<14?'medieval':h>=14&&h<17?'industrial':h>=17&&h<23?'cyber':'gothic';
}
export const states={unconfigured:'進度待設定',foundation:'蓋地基',building:'建築中',complete:'完工'};
const safeUrl=z.string().max(2000).refine(v=>!v||/^https?:\/\//i.test(v)||/^\/api\/island\/asset\/[\w-]+$/.test(v),'請使用 https 網址或已上傳的檔案');
export const itemSchema=z.object({id:z.string().max(80),type:z.enum(['image','text','video','audio','pdf','demo','download','link']),title:z.string().max(120),src:safeUrl.default(''),body:z.string().max(40000).default(''),allowDownload:z.boolean().default(false)});
export const projectSchema=z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),title:z.string().trim().min(1).max(60),category:z.string().min(1).max(30),description:z.string().max(12000),status:z.enum(['unconfigured','foundation','building','complete']),progress:z.number().int().min(0).max(100).nullable(),shape:z.enum(shapeIds),color:z.string().regex(/^#[0-9a-fA-F]{6}$/),items:z.array(itemSchema).max(100),kind:z.enum(['project','social','info','special']).default('project'),privacy:z.enum(['public','private']).default('public'),position:z.object({x:z.number().finite().min(-44).max(44),z:z.number().finite().min(-42).max(42)}).nullable().default(null),islandId:z.enum(['home','technology','mine','art','library','social','information']).default('home'),layoutVersion:z.literal(2).optional(),collectionCategory:z.string().max(30).default(''),categoryIcon:z.enum(['auto','info','app','web','handcraft','creative','photo','social','special','other']).default('auto'),specialType:z.enum(['none','tarot','guestbook','library','gallery','factory','collection']).default('none'),platform:z.enum(['instagram','facebook','threads','line','game','other']).default('other'),accountHandle:z.string().max(100).default(''),accountUrl:safeUrl.default(''),updatedAt:z.string().optional(),deleted:z.boolean().optional()});
export type Project=z.infer<typeof projectSchema>;
export const defaults:Project[]=[
 {id:'shiyuexu',title:'拾月序',category:'App',description:'白語ㄋ的第一個App，用來記錄行程、待辦與日記。',shape:'clock',color:'#9d8cba'},
 {id:'jide',title:'際得',category:'App',description:'還在製作中的App，或許是用來...？',shape:'library',color:'#8da698'},
 {id:'neon',title:'霓虹計畫',category:'App',description:'假如用AI來學習AI...！',shape:'lab',color:'#909fba'},
 {id:'guiyan',title:'歸宴',category:'App',description:'白語ㄋ對工作的熱愛，就是把所有工作流程寫成一套APP。',shape:'manor',color:'#b48287'},
 {id:'marriott',title:'班表E化',category:'網站',description:'委託人為CN，這個網站仍在進行中。',shape:'station',color:'#b5a080'},
 {id:'woven',title:'碎光織行',category:'網站',description:'白語ㄋ的手鍊委託網站！歡迎光臨！',shape:'glass',color:'#a295b2'},
 {id:'travel',title:'旅遊網站',category:'網站',description:'身為一個Ｊ人，希望你將會喜歡這個酷東西。',shape:'harbor',color:'#7ea8b5'},
 {id:'skill-lab',title:'Skill Lab',category:'網站',description:'如果今天AI也能用來學習所有想學的興趣？',shape:'observatory',color:'#b19d78'},
].map(p=>projectSchema.parse({...p,islandId:'technology',layoutVersion:2,status:'unconfigured',progress:null,items:[]}));
const socialSeeds=[
 {id:'instagram-1',title:'Instagram 01',platform:'instagram',color:'#bb8aab',shape:'clock',position:{x:-7,z:4}},
 {id:'instagram-2',title:'Instagram 02',platform:'instagram',color:'#b9a0c4',shape:'glass',position:{x:-7,z:-4}},
 {id:'instagram-3',title:'Instagram 03',platform:'instagram',color:'#bc9a81',shape:'manor',position:{x:0,z:-8}},
 {id:'facebook-public',title:'Facebook 公開帳號',platform:'facebook',color:'#8dabc9',shape:'library',position:{x:7,z:-4}},
 {id:'threads',title:'Threads',platform:'threads',color:'#a29ba9',shape:'observatory',position:{x:7,z:4}},
 {id:'line',title:'LINE',platform:'line',color:'#8fb49a',shape:'harbor',position:{x:0,z:8}},
 {id:'gaming-hub',title:'遊戲基地',platform:'game',color:'#96d8da',shape:'arcade',position:{x:0,z:-14}},
];
export const publicSocialDefaults:Project[]=socialSeeds.map(p=>projectSchema.parse({...p,islandId:p.platform==='game'?'technology':'social',layoutVersion:2,kind:'social',category:p.platform==='game'?'遊戲平台':'社群平台',description:p.platform==='game'?'白語ㄋ最近在玩啥ㄋ！':'這是我的社群入口。帳號名稱與連結等待補上。',status:'complete',progress:100,items:[]}));
export const infoDefaults:Project[]=[
 {id:'about-intro',title:'關於白語寧',position:{x:-7,z:5},description:'在這裡寫下想讓大家認識的自己。內容等待島主補上。'},
 {id:'about-inspiration',title:'興趣與靈感',position:{x:0,z:6},description:'收藏喜歡的事物，以及靈感從哪裡來。內容等待補上。'},
 {id:'about-daily',title:'創作與日常',position:{x:7,z:5},description:'留給創作習慣與生活片段的展板。內容等待補上。'},
 {id:'about-contact',title:'聯絡與合作',position:{x:0,z:-7},description:'可以在這裡放公開的合作方向與聯絡方式。內容等待補上。'},
].map(p=>projectSchema.parse({...p,islandId:'information',layoutVersion:2,kind:'info',category:'資訊',categoryIcon:'info',shape:'cottage',color:'#ad9b8d',status:'complete',progress:100,items:[]}));
export const specialDefaults:Project[]=[
 {id:'daily-tarot',title:'每日塔羅牌',specialType:'tarot',shape:'tarot',color:'#ac90bd',position:{x:-13,z:-7},description:'抽一張今日的牌，留一個與自己對話的問題。'},
 {id:'message-wall',title:'海風留言牆',specialType:'guestbook',shape:'guestbook',color:'#c0a58c',position:{x:0,z:0},description:'把想說的話留在牆上，也讀讀其他旅人留下的信。'},
 {id:'grand-library',title:'碎光圖書館',specialType:'library',shape:'grand-library',color:'#a6957c',position:{x:0,z:0},description:'走進另一個空間，從書櫃與書背之間，慢慢讀一段故事。'},
].map(p=>projectSchema.parse({...p,islandId:p.specialType==='tarot'?'mine':p.specialType==='library'?'library':'social',layoutVersion:2,kind:'special',category:'特殊建築',categoryIcon:'special',status:'complete',progress:100,items:[]}));
export const archipelagoDefaults:Project[]=[
 {id:'island-museum',title:'光影美術館',islandId:'art',specialType:'gallery',shape:'museum',position:{x:0,z:0},description:'走進完整的米白希臘神殿，在神話花園與三層展廊之間，慢慢欣賞攝影、Cosplay 與繪圖作品。'},
 {id:'information-factory',title:'資訊工廠',islandId:'information',specialType:'factory',shape:'factory',position:{x:0,z:0},description:'把關於白語寧的資訊，收在這座仍在運作的工廠裡。'},
 {id:'craft-jewelry',title:'珠飾礦洞',islandId:'mine',specialType:'collection',shape:'mine',collectionCategory:'珠飾',position:{x:-10,z:6},description:'留給珠飾與配件作品的礦洞。可從後台調整分類與內容。'},
 {id:'craft-weaving',title:'編織礦洞',islandId:'mine',specialType:'collection',shape:'mine',collectionCategory:'編織',position:{x:0,z:12},description:'留給編織工藝作品的礦洞。可從後台調整分類與內容。'},
 {id:'craft-other',title:'工藝礦洞',islandId:'mine',specialType:'collection',shape:'mine',collectionCategory:'其他手作',position:{x:10,z:6},description:'留給其他工藝想法的礦洞。可從後台調整分類與內容。'},
].map(p=>projectSchema.parse({...p,kind:'special',category:p.specialType==='collection'?'手做':'特殊建築',categoryIcon:p.specialType==='collection'?'handcraft':'special',layoutVersion:2,color:p.shape==='mine'?'#93766a':'#b6a587',status:'complete',progress:100,items:[]}));
export const publicBuildingDefaults=[...defaults,...publicSocialDefaults,...infoDefaults,...specialDefaults,...archipelagoDefaults];
export const avatarSchema=z.object({name:z.string().trim().min(1).max(24),skin:z.string().regex(/^#[0-9a-fA-F]{6}$/),hair:z.string().regex(/^#[0-9a-fA-F]{6}$/),outfit:z.string().regex(/^#[0-9a-fA-F]{6}$/),hairStyle:z.enum(['short','long','bun']),accessory:z.enum(['none','glasses','hat']),eyes:z.enum(['brown','green','blue','violet'])});
export type Avatar=z.infer<typeof avatarSchema>;
export const guestAvatar:Avatar={name:'旅人',skin:'#e7c4ac',hair:'#272e42',outfit:'#49677f',hairStyle:'short',accessory:'none',eyes:'brown'};
export const ownerAvatar:Avatar={name:'白語寧',skin:'#efd0bb',hair:'#393343',outfit:'#7c4559',hairStyle:'long',accessory:'none',eyes:'brown'};
export const diarySchema=z.object({id:z.string().regex(/^[\w-]{1,80}$/),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),title:z.string().trim().min(1).max(160),body:z.string().max(100000),mood:z.enum(['晴朗','平靜','期待','疲倦','低落','混亂']),images:z.array(z.string().regex(/^\/api\/island\/asset\/[\w-]+$/)).max(12),updatedAt:z.string().optional()});
export type Diary=z.infer<typeof diarySchema>;
export type World={projects:Project[];viewer:{signedIn:boolean;isOwner:boolean;unlocked:boolean;configured:boolean};avatar:Avatar|null;ownerAvatar:Avatar;socials:{label:string;url:string}[];islandName:string};
