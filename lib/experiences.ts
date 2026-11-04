import {z} from 'zod';
const resource=z.string().max(2000).refine(v=>!v||/^https?:\/\//i.test(v)||/^\/api\/island\/asset\/[\w-]+$/.test(v),'請使用 https 網址或已上傳的檔案');
export const bookSchema=z.object({id:z.string().regex(/^[\w-]{1,80}$/),libraryId:z.string().regex(/^[\w-]{1,80}$/).default('grand-library'),title:z.string().trim().min(1).max(160),author:z.string().max(160).default(''),kind:z.enum(['book','note']).default('book'),description:z.string().max(10000).default(''),notes:z.string().max(100000).default(''),coverUrl:resource.default(''),resourceUrl:resource.default(''),color:z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#896d7c'),privacy:z.enum(['public','private']).default('public'),status:z.enum(['想讀','閱讀中','已讀','收藏']).default('收藏'),tags:z.string().max(300).default(''),updatedAt:z.string().optional()});
export type LibraryBook=z.infer<typeof bookSchema>;
export {rewards,emptyEquipped,featherReward} from './collectibles.ts';
export type {Reward,Equipped} from './collectibles.ts';
import type {Reward,Equipped} from './collectibles.ts';
export type ActiveBottle={id:string;x:number;z:number;expiresAt:number;islandId:string};
export type ExploreData={catalog:Reward[];inventory:(Reward&{acquiredAt:number})[];equipped:Equipped;bottles:ActiveBottle[];signedIn:boolean;nextSpawnAt:number;chick:ChickVisit;featherCount:number;feathers:{day:string;acquiredAt:number}[];featherClaimedToday:boolean};
export type TarotCard={id:string;name:string;english:string;number:string;suit:string;upright:string;reversed:string;question:string};
const major=[
 ['愚者','The Fool','給未知留一點空間，先跨出能承受的一小步。','衝動之前，先確認自己要帶走什麼、留下什麼。','今天有哪件小事，值得容許自己第一次嘗試？'],
 ['魔術師','The Magician','把手邊已有的能力組合起來，讓想法落地。','工具很多時，先選一件真正用得上的。','我已經具備、卻還沒有善用的資源是什麼？'],
 ['女祭司','The High Priestess','暫停追問，讓感受與線索慢慢浮上來。','別讓猜測取代證據，也別把直覺完全關掉。','哪個感受，我其實已經察覺，只是還沒說出口？'],
 ['皇后','The Empress','照顧自己的身體與創造力，讓生活有生長的餘地。','當照顧變成消耗，記得把自己也放進名單。','今天能用什麼具體方式，對自己溫柔一點？'],
 ['皇帝','The Emperor','清楚的界線與安排，能讓想做的事走得更遠。','規則若已不合用，就為它留下調整的門。','我需要建立哪一條界線，才能保護重要的事？'],
 ['教皇','The Hierophant','向經驗請教，理解規則背後真正重視的價值。','不必只因為一直如此，就繼續照同一條路走。','哪些原則是我真心認同，哪些只是習慣？'],
 ['戀人','The Lovers','把選擇放回自己的價值，誠實面對關係與承諾。','遇到拉扯時，先分清楚期待、需要與害怕。','這個選擇，是否接近我想成為的人？'],
 ['戰車','The Chariot','把方向握穩，用可以持續的步伐往前。','跑得太快之前，先確認方向與體力仍然一致。','今天最值得集中力氣的一件事是什麼？'],
 ['力量','Strength','柔軟與耐心，也是一種能承擔重量的力量。','疲倦不是失敗，先讓自己有恢復的空間。','我能不能用理解，代替一次對自己的責備？'],
 ['隱者','The Hermit','留一段安靜的時間，聽清楚自己的問題。','獨處可以休息，也需要留一條與人連結的路。','我現在需要的是答案，還是安靜？'],
 ['命運之輪','Wheel of Fortune','看見正在變動的條件，抓住可以回應的部分。','面對變化，先整理仍由自己決定的事情。','有哪些變化我無法控制，又能如何回應？'],
 ['正義','Justice','分清事實、感受與責任，讓判斷更公平。','先查清楚，再替自己或別人下結論。','我是否對自己與他人使用了相同的標準？'],
 ['倒吊人','The Hanged Man','暫時換個角度，也許能看見原本忽略的路。','等待若只剩消耗，可以重新檢查付出的意義。','如果不急著證明自己，我會怎麼看這件事？'],
 ['死神','Death','讓已經完成的階段好好結束，替新事物騰位置。','不必一次放下全部，可以先鬆開一個過時的習慣。','我想告別的是什麼，又想保留其中的什麼？'],
 ['節制','Temperance','找到能長久維持的比例，慢慢調整而非逼迫。','當生活失衡，先修正一個最影響日常的小地方。','今天哪一件事，做到剛剛好就足夠？'],
 ['惡魔','The Devil','誠實看見慾望與習慣，重新辨認自己能選擇的部分。','把束縛說清楚，才有機會為它鬆綁。','我正在追求喜歡的事，還是被害怕推著走？'],
 ['高塔','The Tower','當舊方法失去作用，先站穩，再重整真正的需要。','與其勉強維持表面，不如先處理已看見的裂縫。','有什麼需要被重新檢查，而不是繼續硬撐？'],
 ['星星','The Star','給希望一個小而具體的行動，讓它有地方停靠。','期待不需要很巨大，先找回一點可相信的日常。','哪個微小進展，值得我今天好好承認？'],
 ['月亮','The Moon','在資訊還不完整的時候，先允許不確定存在。','把想像與已知分開，讓疑問有機會被核實。','我目前知道什麼，又有哪些只是推測？'],
 ['太陽','The Sun','把注意力放回清楚、直接、能帶來活力的事。','不必勉強表現愉快，真實的狀態同樣值得被看見。','什麼讓我感到輕鬆，而不需要努力扮演？'],
 ['審判','Judgement','回頭整理經驗，為下一段路做出自己的回應。','反省可以幫助成長，反覆責備卻未必有用。','從過去走到現在，我已經學會了什麼？'],
 ['世界','The World','看見一路累積的成果，讓完成有自己的儀式。','尚未完成的部分，可以拆成下一個明確的小步驟。','哪一段旅程，值得我停下來好好收尾？'],
];
const romans=['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];
const suits=[['權杖','Wands','熱情與行動','先選一個可以開始的動作。'],['聖杯','Cups','感受與關係','替感受找到能被理解的語句。'],['寶劍','Swords','思考與溝通','把事實與推測分開整理。'],['錢幣','Pentacles','生活與累積','從一個可持續的日常安排開始。']];
const ranks=['王牌','二','三','四','五','六','七','八','九','十','侍者','騎士','皇后','國王'];
const lessons=['新的起點','合作與取捨','嘗試與發展','穩定與休息','挑戰與調整','支持與回應','辨認與選擇','練習與前進','整理與持續','完成與承擔','好奇與學習','方向與行動','理解與照顧','成熟與責任'];
export const tarotDeck:TarotCard[]=[...major.map((m,i)=>({id:'major-'+i,name:m[0],english:m[1],number:romans[i],suit:'大阿爾克那',upright:m[2],reversed:m[3],question:m[4]})),...suits.flatMap(([name,english,theme,action],s)=>ranks.map((rank,i)=>({id:`minor-${s}-${i}`,name:name+rank,english:`${['Ace','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Page','Knight','Queen','King'][i]} of ${english}`,number:i<10?String(i+1):['PAGE','KNIGHT','QUEEN','KING'][i-10],suit:name,upright:`今天可以從「${theme}」留意${lessons[i]}。${action}`,reversed:`與「${theme}」有關的事情，可以先放慢，檢查是否忽略自己的需要，再調整步伐。`,question:`關於${theme}，今天有哪一件小事，能讓我更接近想要的狀態？`})) )];

export const artworkSchema=z.object({id:z.string().regex(/^[\w-]{1,80}$/),galleryId:z.string().regex(/^[\w-]{1,80}$/).default('island-museum'),title:z.string().trim().min(1).max(160),medium:z.enum(['painting','photo','video']).default('painting'),gallerySection:z.enum(['auto','photography','cosplay','drawing']).default('auto'),description:z.string().max(20000).default(''),src:resource.default(''),thumbnail:resource.default(''),year:z.string().max(40).default(''),color:z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#a58b87'),privacy:z.enum(['public','private']).default('public'),updatedAt:z.string().optional()});
export type Artwork=z.infer<typeof artworkSchema>;
export type ChickVisit={visitId:string;from:{x:number;z:number;y:number};to:{x:number;z:number;y:number};islandId:string;startsAt:number;landsAt:number;expiresAt:number};
