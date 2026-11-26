/* Evidence-bound boutique service catalog for Metro Detroit small businesses. */
(function(root){
'use strict';
const clone=value=>JSON.parse(JSON.stringify(value));
const CATALOG={id:'meiqq-boutique-services-2026-v1',version:1,asOf:'2026-11-18',market:'Metro Detroit',currency:'USD'};
const SOURCES=[
 {id:'mi.bunique.2026-11-18',title:'B-Unique Designz — Graphic Designer Lansing MI',url:'https://needgraphicsfast.com/graphic-design-lansing-mi/',publisher:'B-Unique Designz',location:'Lansing, MI',retrieved:'2026-11-18',kind:'provider-price-list',observations:['Logo design starts at $200','Menu design starts at $100','Flyer design starts at $75 one-sided and $135 two-sided','Social-media design starts at $50','Launch bundles list three items at $500, four at $750, and five at $1,250'],caveat:'Starting prices and provider bundles; project complexity and print specifications can change the quote.'},
 {id:'mi.laureano.2026-11-18',title:'Dana Laureano — Design Pricing',url:'https://www.danalaureano.com/pricing',publisher:'Dana Laureano',location:'Rockford, MI',retrieved:'2026-11-18',kind:'provider-price-list',observations:['Standard hourly rate $50','Logo design $300','Logo includes AI/JPG/PNG, 5–8 first-round marks, up to five revisions, and a brand sheet'],caveat:'Independent-provider public list; logo scope is broader than this catalog’s one-concept starter.'},
 {id:'mi.northcountry.2026-11-18',title:'North Country Website Design — Graphic Design',url:'https://northcountrywebsitedesign.com/graphic-design',publisher:'North Country Website Design',location:'Upper Peninsula, MI',retrieved:'2026-11-18',kind:'provider-price-list',observations:['Logo plus branding kit estimated at $275','Other graphic design $84 per hour','Restaurant menu design is offered at the hourly rate'],caveat:'Michigan comparison outside Metro Detroit; menu total depends on hours.'},
 {id:'mi.appwt.2026-11-18',title:'AppWT Graphics — Graphic Design and Visual Branding',url:'https://appwt.graphics/',publisher:'AppWT Graphics',location:'Livonia, MI',retrieved:'2026-11-18',kind:'provider-price-list',observations:['Logo design from $447 with three concepts in the startup package','Print design from $147','Digital design from $297'],caveat:'Starting prices; provider advertises unlimited revisions, which this catalog does not assume.'},
 {id:'mi.royal.2026-11-18',title:'Royal Printing — Price List',url:'https://www.royalprinting123.com/prices.html',publisher:'Royal Printing',location:'Detroit, MI',retrieved:'2026-11-18',kind:'printer-price-list',observations:['100 8.5x11 100lb gloss brochures $200; 250 $300','100 rush 4x6 UV postcards $80; 250 $100','Adhesive vinyl $5–$10 per square foot; premium window cling $5 and perforated window vinyl $8 per square foot','Local pickup is free; listed service mentions 10lb ground shipping and one free artwork/setup hour'],caveat:'Basic listed prices; taxes, installation, specialty finishing, excess shipping, and current availability are not established.'},
 {id:'mi.printyco.2026-11-18',title:'Printyco Michigan — Product Prices',url:'https://printycomi.com/',publisher:'Printyco',location:'Warren, MI',retrieved:'2026-11-18',kind:'printer-price-list',observations:['100 table tents $95','1,000 flyers $250','1,000 postcards $130','25 posters $75','24x64 X-banner $85'],caveat:'Public product page gives limited stock, side, finishing, shipping, and tax detail; those omissions are not inferred.'},
 {id:'us.takeoutmenu.2026-11-18',title:'Takeout Menu Printing — Design Cost',url:'https://www.takeoutmenuprint.com/more/design_cost.html',publisher:'Takeout Menu Printing',location:'United States',retrieved:'2026-11-18',kind:'provider-price-list',observations:['File preparation $95','Template-based menu design $250','Brand-upgrade menu design $600'],caveat:'Broader US comparator, not a Metro Detroit quote; printing is separately specified.'}
];
const OBSERVATION_HASHES={'mi.bunique.2026-11-18':'08fe5e00','mi.laureano.2026-11-18':'2e7199dd','mi.northcountry.2026-11-18':'2f84b4bb','mi.appwt.2026-11-18':'773e230a','mi.royal.2026-11-18':'247ae78b','mi.printyco.2026-11-18':'8445e236','us.takeoutmenu.2026-11-18':'802b615f'};
for(const source of SOURCES)source.observationHash=OBSERVATION_HASHES[source.id];
const PRINT_OBSERVATIONS=[
 {id:'print.postcard-250',sourceId:'mi.royal.2026-11-18',quantity:250,spec:'4x6, 14pt/16pt UV, one side as listed',observedPrice:100,shippingIncluded:false},
 {id:'print.brochure-100',sourceId:'mi.royal.2026-11-18',quantity:100,spec:'8.5x11, 100lb gloss text',observedPrice:200,shippingIncluded:false},
 {id:'print.table-tent-100',sourceId:'mi.printyco.2026-11-18',quantity:100,spec:'Table tents; stock, size and finishing not stated',observedPrice:95,shippingIncluded:false},
 {id:'print.poster-25',sourceId:'mi.printyco.2026-11-18',quantity:25,spec:'Posters; size and stock not stated',observedPrice:75,shippingIncluded:false},
 {id:'print.window-vinyl-12sf',sourceId:'mi.royal.2026-11-18',quantity:12,spec:'12 square feet adhesive vinyl at $6/sq ft modeled from listed $5–$10 range; installation excluded',observedPrice:null,modeledPrice:72,shippingIncluded:false}
];
const spec=(id,scope,deliverables,includedRevisions,printQuantity,printSpec,printCostBasis,evidenceIds,modeledPriceRange,modeledPrintCostRange)=>({catalogId:CATALOG.id,packageId:id,version:1,scope,deliverables,includedRevisions,printQuantity,printSpec,printCostBasis,evidenceIds,modeledPriceRange,modeledPrintCostRange});
const SERVICES=[
 {id:'digital-flyer',name:'Digital promo flyer',deliverable:'One promotion layout sized for web and social',price:175,hours:4,review:1,print:0,weight:12,recurring:false,audience:'all',color:'#287d77',spec:spec('digital-flyer','One supplied-message layout; copywriting, photography and ad buying excluded.',['One master layout','Two platform-ready exports'],2,null,null,null,['mi.bunique.2026-11-18','mi.appwt.2026-11-18'],[125,250],null)},
 {id:'postcard-250',name:'Promo postcards · 250',deliverable:'Design plus 250 printed 4x6 postcards',price:325,hours:4.5,review:1,print:100,weight:10,recurring:false,audience:'all',color:'#397aa8',spec:spec('postcard-250','One offer, one side, supplied copy and images; mailing/postage excluded.',['Print-ready postcard','250 printed postcards'],2,250,'4x6, 14pt/16pt UV, one side','Royal listed 250-piece rush batch at $100; tax, delivery and postage excluded.',['mi.royal.2026-11-18','mi.bunique.2026-11-18'],[275,425],[100,140])},
 {id:'table-tents-100',name:'Table-tent promo · 100',deliverable:'One table-tent layout plus 100 printed tents',price:395,hours:5,review:1.25,print:95,weight:10,recurring:false,audience:'food',color:'#8a6fb0',spec:spec('table-tents-100','One promotion using supplied copy/menu items; structural dieline changes excluded.',['Two-sided table-tent artwork','100 printed table tents'],2,100,'Printer-listed table tents; exact size, stock and finishing not stated','Printyco public minimum: 100 for $95; shipping and tax excluded.',['mi.printyco.2026-11-18','mi.bunique.2026-11-18'],[350,525],[95,150])},
 {id:'menu-refresh',name:'Menu refresh · print-ready',deliverable:'Update one existing two-page menu',price:350,hours:7,review:1.5,print:0,weight:13,recurring:false,audience:'food',color:'#bd8753',spec:spec('menu-refresh','Client supplies final prices, descriptions and existing brand assets; no naming, food costing or copywriting.',['One two-page menu layout','Print-ready PDF','Web PDF'],2,null,null,null,['mi.bunique.2026-11-18','mi.northcountry.2026-11-18','us.takeoutmenu.2026-11-18'],[250,550],null)},
 {id:'takeout-menus-100',name:'Takeout menus · 100',deliverable:'Menu refresh plus 100 printed 8.5x11 pieces',price:575,hours:7,review:1.5,print:200,weight:10,recurring:false,audience:'food',color:'#9b7147',spec:spec('takeout-menus-100','Same supplied-content scope as menu refresh; fold configuration must be confirmed before order.',['Menu layout','Print-ready and web PDFs','100 printed menus'],2,100,'8.5x11, 100lb gloss text; fold not included in observed printer price','Royal listed 100-piece 8.5x11 gloss brochure batch at $200; folding, tax and delivery excluded.',['mi.royal.2026-11-18','us.takeoutmenu.2026-11-18'],[500,750],[200,275])},
 {id:'window-promo-12sf',name:'Window promo · 12 sq ft',deliverable:'One storefront window graphic, print only',price:425,hours:5,review:1.25,print:72,weight:8,recurring:false,audience:'retail',color:'#647fa3',spec:spec('window-promo-12sf','One rectangular promotion up to 12 square feet; field measurement, permits, removal and installation excluded.',['Scaled proof','Print-ready art','Up to 12 sq ft adhesive vinyl'],2,12,'Adhesive vinyl, 12 square feet; material selection confirmed with printer','Modeled at $6/sq ft inside Royal’s listed $5–$10 range. Installation, tax and delivery excluded.',['mi.royal.2026-11-18','mi.bunique.2026-11-18'],[350,600],[60,120])},
 {id:'brand-starter',name:'Basic brand starter',deliverable:'One logo direction, palette, type and export kit',price:425,hours:12,review:2,print:0,weight:8,recurring:false,audience:'all',color:'#9a635f',spec:spec('brand-starter','One concept developed after a short brief; naming, strategy, trademark search and stationery excluded.',['Primary logo','Color palette','Type selection','AI/SVG/PDF/PNG/JPG exports','One-page reference sheet'],2,null,null,null,['mi.laureano.2026-11-18','mi.northcountry.2026-11-18','mi.appwt.2026-11-18','mi.bunique.2026-11-18'],[300,600],null)},
 {id:'social-pack-4',name:'Social promo pack · 4',deliverable:'Four static posts for one promotion',price:300,hours:7,review:1.5,print:0,weight:10,recurring:false,audience:'all',color:'#706bad',spec:spec('social-pack-4','One campaign/message using supplied copy and imagery; posting, community management and paid media excluded.',['Four static post designs','One platform size per design'],2,null,null,null,['mi.bunique.2026-11-18','mi.appwt.2026-11-18'],[240,425],null)},
 {id:'poster-pack-25',name:'Store poster pack · 25',deliverable:'One poster design plus 25 printed posters',price:325,hours:4.5,review:1,print:75,weight:8,recurring:false,audience:'all',color:'#5f8b69',spec:spec('poster-pack-25','One offer and one layout; exact printer size and stock require quote confirmation.',['Print-ready poster','25 printed posters'],2,25,'Printer-listed posters; size and stock not stated','Printyco public minimum: 25 for $75; shipping and tax excluded.',['mi.printyco.2026-11-18','mi.bunique.2026-11-18'],[275,425],[75,125])},
 {id:'monthly-promo-5',name:'Monthly physical offer kit',deliverable:'Coordinated counter/poster run plus four digital companions',price:625,hours:12,review:2,print:75,weight:11,recurring:true,audience:'all',color:'#a56b84',spec:spec('monthly-promo-5','One supplied monthly offer and customer-owned destination URL; hosting, analytics, posting, ad spend, copywriting and photography excluded.',['One campaign key visual','25 printed in-store posters with a trackable-URL-ready QR placement','Four static digital companion graphics'],2,25,'Printer-listed poster batch; exact size and stock not stated','Printyco public minimum: 25 posters for $75; shipping and tax excluded. QR destination and tracking remain customer-owned.',['mi.printyco.2026-11-18','mi.bunique.2026-11-18','mi.appwt.2026-11-18'],[550,800],[75,125])},
 {id:'seasonal-campaign',name:'Seasonal storefront campaign',deliverable:'Quarterly poster/postcard campaign, quoted per cycle',price:850,hours:14,review:2.5,print:175,weight:0,recurring:true,audience:'all',color:'#7d7651',spec:spec('seasonal-campaign','One seasonal offer using supplied copy, imagery and customer-owned destination URL; each cycle is quoted and paid separately. Installation, hosting, analytics, posting and ad spend excluded.',['One seasonal key visual','One window/poster adaptation','25 printed posters','250 printed 4x6 postcards','Four digital companion graphics'],2,275,'25 posters plus 250 postcards; window art is design-only unless separately quoted','Printyco observed 25 posters at $75 plus Royal observed 250 postcards at $100; shipping, tax and installation excluded.',['mi.printyco.2026-11-18','mi.royal.2026-11-18','mi.bunique.2026-11-18'],[750,1050],[175,260])}
];
const GOALS={
 'digital-flyer':'Promote one timely offer','postcard-250':'Put one local offer in customers’ hands','table-tents-100':'Promote one in-store food offer','menu-refresh':'Make current menu choices clear','takeout-menus-100':'Make takeout choices clear in print','window-promo-12sf':'Make one storefront offer visible','brand-starter':'Establish a basic visual identity','social-pack-4':'Promote one offer across four posts','poster-pack-25':'Display one local offer in-store','monthly-promo-5':'Maintain a predictable monthly promotion rhythm','seasonal-campaign':'Maintain a year-round seasonal storefront relationship'
};
for(const service of SERVICES){service.goal=GOALS[service.id];service.category=service.recurring?'recurring':service.id==='brand-starter'?'branding':service.id.includes('menu')?'menu':service.id.includes('window')?'visibility':'offer';if(service.print>0)service.spec.printUnit=service.id==='window-promo-12sf'?'sq ft':'pieces';}
const DESIGN_ONLY_PRICES={'postcard-250':200,'table-tents-100':275,'takeout-menus-100':350,'window-promo-12sf':325,'poster-pack-25':225,'monthly-promo-5':500,'seasonal-campaign':600};
const FILES_ONLY_SCOPE={
 'postcard-250':'Print-ready artwork for one 4×6 postcard.',
 'table-tents-100':'Print-ready files for one two-sided table-tent design.',
 'takeout-menus-100':'Print-ready and web PDFs for one updated menu.',
 'window-promo-12sf':'Scaled proof and print-ready artwork for one window graphic.',
 'poster-pack-25':'Print-ready artwork for one store poster.',
 'monthly-promo-5':'Campaign key visual, print-ready poster and four digital companion graphics.',
 'seasonal-campaign':'Print-ready poster and postcard artwork plus the agreed digital campaign files.'
};
for(const service of SERVICES)if(service.print>0){
 service.fulfillment={mode:'customer-choice',managedShare:.70,designOnlyPrice:DESIGN_ONLY_PRICES[service.id]};
 service.filesOnlyScope=FILES_ONLY_SCOPE[service.id];
}
SERVICES.find(service=>service.id==='monthly-promo-5').campaign={cadenceDays:30,relationshipDays:365};
SERVICES.find(service=>service.id==='seasonal-campaign').campaign={cadenceDays:90,relationshipDays:365};
const DERIVATIONS={
 'digital-flyer':{designLabor:72,ownerTime:79.8,supplierCost:0,costFloor:151.8,explanation:'4 designer hours × $18 + 2.1 owner hours × $38 = $151.80 modeled cost floor; $175 sell price is above the floor and within the $125–$250 modeled range informed by Michigan $50+ social, $75+ flyer and $147+ print-design starts.'},
 'postcard-250':{designLabor:81,ownerTime:79.8,supplierCost:100,costFloor:260.8,explanation:'4.5 designer hours × $18 + 2.1 owner hours × $38 + Royal’s observed $100 batch = $260.80 floor; $325 allows coordination risk while staying inside $275–$425.'},
 'table-tents-100':{designLabor:90,ownerTime:89.3,supplierCost:95,costFloor:274.3,explanation:'5 designer hours × $18 + 2.35 owner hours × $38 + Printyco’s observed $95 minimum batch = $274.30 floor; $395 remains inside $350–$525.'},
 'menu-refresh':{designLabor:126,ownerTime:98.8,supplierCost:0,costFloor:224.8,explanation:'7 designer hours × $18 + 2.6 owner hours × $38 = $224.80 floor; $350 sits between published $250 template-menu work and $600 brand-upgrade work and below 7 hours at the published $84 Michigan rate.'},
 'takeout-menus-100':{designLabor:126,ownerTime:98.8,supplierCost:200,costFloor:424.8,explanation:'Menu-refresh labor floor $224.80 + Royal’s observed $200 batch = $424.80; $575 is within $500–$750 and retains room for print coordination.'},
 'window-promo-12sf':{designLabor:90,ownerTime:89.3,supplierCost:72,costFloor:251.3,explanation:'5 designer hours × $18 + 2.35 owner hours × $38 + 12 sq ft × modeled $6 from Royal’s listed $5–$10 = $251.30; $425 excludes installation and sits within $350–$600.'},
 'brand-starter':{designLabor:216,ownerTime:117.8,supplierCost:0,costFloor:333.8,explanation:'12 designer hours × $18 + 3.1 owner hours × $38 = $333.80 floor; $425 is within the observed Michigan starter-logo span of $275–$447 while deliberately offering fewer concepts than several comparators.'},
 'social-pack-4':{designLabor:126,ownerTime:98.8,supplierCost:0,costFloor:224.8,explanation:'7 designer hours × $18 + 2.6 owner hours × $38 = $224.80 floor; $300 equals $75 per supplied-content asset and lies in the $240–$425 modeled range informed by $50+ social and $297+ digital starts.'},
 'poster-pack-25':{designLabor:81,ownerTime:79.8,supplierCost:75,costFloor:235.8,explanation:'4.5 designer hours × $18 + 2.1 owner hours × $38 + Printyco’s observed $75 batch = $235.80 floor; $325 remains within $275–$425.'},
 'monthly-promo-5':{designLabor:216,ownerTime:117.8,supplierCost:75,costFloor:408.8,explanation:'12 designer hours × $18 + 3.1 owner hours × $38 + Printyco’s observed $75 poster batch = $408.80 floor; $625 covers one coordinated physical run and four digital companions inside $550–$800. No public source validates its demand share or renewal probability.'},
 'seasonal-campaign':{designLabor:252,ownerTime:136.8,supplierCost:175,costFloor:563.8,explanation:'14 designer hours × $18 + 3.6 owner hours × $38 + observed $75 poster and $100 postcard batches = $563.80 floor; $850 covers a separately quoted seasonal cycle inside $750–$1,050. No public source validates a quarterly renewal rate.'}
};
for(const [id,designOnlyPrice] of Object.entries(DESIGN_ONLY_PRICES))Object.assign(DERIVATIONS[id],{designOnlyPrice,designOnlyCostFloor:Math.round((DERIVATIONS[id].designLabor+DERIVATIONS[id].ownerTime)*100)/100,designOnlyBasis:`Modeled self-print sell price $${designOnlyPrice}; supplier cost is removed while planned design and owner effort remains. This is a pricing policy, not a published provider observation.`,managedShare:.70,managedShareBasis:'Unmeasured model prior: 70% choose agency-managed printing and 30% choose self-print. Replace with accepted-quote history.'});
DERIVATIONS['monthly-promo-5'].campaignPolicy={cadenceDays:30,relationshipDays:365,basis:'User-directed monthly relationship policy; every campaign is separately quoted and paid, and a skipped cycle is not accumulated.'};
DERIVATIONS['seasonal-campaign'].campaignPolicy={cadenceDays:90,relationshipDays:365,basis:'User-directed quarterly relationship policy; every campaign is separately quoted and paid, and a skipped cycle is not accumulated.'};
for(const service of SERVICES)DERIVATIONS[service.id].numericAssumptions={
 price:{value:service.price,basis:'Modeled sell price; see package explanation and public comparables.'},
 hours:{value:service.hours,basis:'Planned remote-designer hours including the stated feedback rounds; unmeasured until time tracking replaces it.'},
 review:{value:service.review,basis:'Planned owner review hours; unmeasured until studio time tracking replaces it.'},
 print:{value:service.print,basis:service.print>0?'Supplier allowance tied to the stated frozen printer observation; live quote still required.':'No agency supplier purchase in this package.'},
 weight:{value:service.weight,basis:'Library/default demand weight, not observed inquiry share; zero means opt-in only.'},
 includedRevisions:{value:service.spec.includedRevisions,basis:'Package policy assumption, not a measured revision frequency.'},
 printQuantity:{value:service.spec.printQuantity,basis:service.spec.printQuantity===null?'Digital delivery; no print quantity.':'Package scope quantity tied to the stated printer comparison.'},
 modeledPriceRange:{value:clone(service.spec.modeledPriceRange),basis:'Planning interval bounded by cited comparables and modeled cost floor; not a statistical confidence interval.'},
 modeledPrintCostRange:{value:clone(service.spec.modeledPrintCostRange),basis:service.spec.modeledPrintCostRange?'Planning interval around the cited supplier observation; not a guaranteed quote.':'No print-cost range for digital delivery.'}
};
const BUNDLES=[
 {id:'restaurant-starter',name:'Restaurant everyday starter',note:'Menu, table and monthly promotion work for an independent food business. The 40/30/30 example weights apply within each eligible customer group. Customer mix determines the overall shares.',items:[{id:'menu-refresh',weight:40},{id:'table-tents-100',weight:30},{id:'monthly-promo-5',weight:30}]},
 {id:'retail-starter',name:'Retail everyday starter',note:'Storefront, print and social promotion for an independent shop. The 30/30/40 example weights apply within each eligible customer group.',items:[{id:'window-promo-12sf',weight:30},{id:'poster-pack-25',weight:30},{id:'social-pack-4',weight:40}]},
 {id:'services-starter',name:'Local-service starter',note:'Simple digital and print promotions for appointment and neighborhood services. The 35/30/35 example weights apply within each eligible customer group.',items:[{id:'digital-flyer',weight:35},{id:'postcard-250',weight:30},{id:'monthly-promo-5',weight:35}]}
];
const BUNDLE_DERIVATIONS={
 'restaurant-starter':{weights:{'menu-refresh':40,'table-tents-100':30,'monthly-promo-5':30},basis:'Unmeasured starter prior balancing menu work, in-store offers and ongoing physical campaigns; not published demand.'},
 'retail-starter':{weights:{'window-promo-12sf':30,'poster-pack-25':30,'social-pack-4':40},basis:'Unmeasured starter prior balancing storefront visibility, printed offers and digital companions; not published demand.'},
 'services-starter':{weights:{'digital-flyer':35,'postcard-250':30,'monthly-promo-5':35},basis:'Unmeasured starter prior balancing fast digital, local print and ongoing physical campaigns; not published demand.'}
};
// These proposed offers have their own provenance. The original packages,
// supplier observations and starter mixes above keep their frozen definitions.
const OPPORTUNITY_CATALOG={id:'meiqq-studio-opportunities-2026-v1',version:1,asOf:'2026-11-26',currency:'USD'};
const recommendations={};
const chineseCopy={};
function copy(en,zh){chineseCopy[en]=zh;return en;}
const planningSource='model.studio-scope.2026-11-26';
const salesSource='shopify.sales.2026-11-26',profitSource='shopify.costs.2026-11-26',productsSource='shopify.products.2026-11-26',tradeSource='ita.export-costs.2026-11-26';
const workflowCaveat=copy('This source describes a workflow. The proposed fee and time budget are studio planning assumptions.','该资料说明工作方法。报价和工时预算均为工作室自行设定的模拟值。');
const newSources=[
 {id:planningSource,title:copy('Studio scope and labor assumptions','工作室服务范围与工时假设'),publisher:'MEIQQ',kind:'planning-assumptions',observations:[copy('Each proposal starts with a bounded delivery, one review round and zero inquiry share.','每项服务均约定具体交付范围、一轮修改，初始询盘占比为零。')],caveat:copy('Replace the suggested fee, work hours and owner review allowance with your own quote and delivery records.','请根据自己的报价和交付记录调整建议收费、制作工时和负责人审核工时。')},
 {id:salesSource,title:copy('Shopify sales reports','Shopify 销售报告'),publisher:'Shopify',kind:'workflow-reference',url:'https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/sales-report',observations:[copy('Product-level sales and discount reports can be grouped by item or discount. Returns and changes to product names affect comparisons.','可按商品或折扣汇总销售数据。退货和商品改名都会影响对比。')],caveat:workflowCaveat},
 {id:profitSource,title:copy('Shopify profit reports and cost coverage','Shopify 利润报告与成本数据覆盖范围'),publisher:'Shopify',kind:'workflow-reference',url:'https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/profit-reports',observations:[copy('A product needs a recorded cost at the time of sale to appear in the corresponding profit report.','只有销售发生时已记录成本的商品，才会出现在相应的利润报告中。')],caveat:workflowCaveat},
 {id:productsSource,title:copy('Shopify product CSV structure','Shopify 商品 CSV 字段结构'),publisher:'Shopify',kind:'workflow-reference',url:'https://help.shopify.com/en/manual/products/import-export/using-csv',observations:[copy('CSV files can carry product and variant details between a shop and other tools.','CSV 文件可用于在店铺与其他工具之间传递商品及规格数据。')],caveat:workflowCaveat},
 {id:tradeSource,title:copy('International Trade Administration guide to total export price','美国国际贸易署出口总价指南'),publisher:'International Trade Administration',kind:'workflow-reference',url:'https://www.trade.gov/determine-total-export-price',observations:[copy('Freight, insurance, duties, taxes and fees can affect the delivered price of an order.','运费、保险、关税、税款和其他费用都可能影响到货总价。')],caveat:workflowCaveat}
];
const proposalObservationHashes={[planningSource]:'4d632bba',[salesSource]:'cce46b37',[profitSource]:'db4235c4',[productsSource]:'26b16117',[tradeSource]:'7e95e704'};
for(const record of newSources)SOURCES.push({...record,retrieved:OPPORTUNITY_CATALOG.asOf,observationHash:proposalObservationHashes[record.id]});
const categoryColors={analytics:'#4c8083',catalog:'#936948',localization:'#667ca6',sourcing:'#7d7354','client-experience':'#886d93',menu:'#9c735c',visibility:'#537c75',recurring:'#a56b84',offer:'#647fa3'};
const filesDelivery=copy('Electronic files only. The customer arranges production or implementation.','仅交付电子文件。制作或上线由客户自行安排。');
const productionBasis=copy('Use the simulator designer-hours field for paid production or specialist work. Set its rate to the actual person doing this job.','在模拟器的设计工时字段中填写制作或专业人员的工时，并按实际人员设置费率。');
const rangeBasis=copy('Planning range from 85% to 125% of the proposed fee, rounded to $5. The lower end also covers the modeled cost floor.','规划范围为建议服务费的 85% 至 125%，按 $5 取整，下限同时覆盖估算成本。');
const paidCycle=copy('User-directed campaign terms require a new accepted quote and payment each cycle. The model uses a 365-day relationship.','沿用模拟器的周期服务规则，每期单独报价、接受和付款，模拟关系持续 365 天。');
function addProposal(idea){
 const {id,category,audience,name,buyer,benefit,inputs,boundary,outputs,price,hours,review,sourceIds=[],printLike,filesPrice,cadenceDays}=idea;
 const printed=printLike&&SERVICES.find(service=>service.id===printLike);
 const supplierCost=printed?.print||0,designLabor=Math.round(hours*18*100)/100,ownerTime=Math.round((review+1.1)*38*100)/100;
 const costFloor=Math.round((designLabor+ownerTime+supplierCost)*100)/100;
 const range=[Math.max(Math.ceil(costFloor/5)*5,Math.round(price*.85/5)*5),Math.round(price*1.25/5)*5];
 const scope=copy(inputs+' '+boundary,chineseCopy[inputs]+chineseCopy[boundary]);
 const spec={catalogId:OPPORTUNITY_CATALOG.id,packageId:id,version:1,scope,deliverables:[...outputs],includedRevisions:1,
  printQuantity:printed?.spec.printQuantity??null,printSpec:printed?.spec.printSpec??null,printCostBasis:printed?.spec.printCostBasis??null,
  evidenceIds:[planningSource,...sourceIds,...(printed?[printed.spec.evidenceIds[0]]:[])],modeledPriceRange:range,modeledPrintCostRange:printed?[...printed.spec.modeledPrintCostRange]:null};
 const service={id,name,deliverable:outputs[0],price,hours,review,print:supplierCost,weight:0,recurring:Boolean(cadenceDays),audience,color:categoryColors[category],goal:benefit,category,spec};
 const model={designLabor,ownerTime,supplierCost,costFloor,explanation:copy(
  'This scope allows '+hours+' production hours at $18/hour and '+(review+1.1).toFixed(2)+' owner hours at $38/hour, including quoting and delivery. The supplier allowance is $'+supplierCost+'. The proposed fee is $'+price+' before overhead.',
  '本项目按 '+hours+' 小时制作工时（每小时 $18）和 '+(review+1.1).toFixed(2)+' 小时负责人工时（每小时 $38，含报价与交付）估算。供应商预算为 $'+supplierCost+'，建议服务费为 $'+price+'，尚未扣除间接费用。')};
 if(printed){
  spec.printUnit=printed.spec.printUnit;
  spec.deliverables.push(copy(printed.id==='postcard-250'?'250 printed one-sided postcards':'100 printed letter-size sheets',printed.id==='postcard-250'?'250 张单面明信片':'100 张美式信纸尺寸的印品'));
  service.fulfillment={mode:'customer-choice',managedShare:.7,designOnlyPrice:filesPrice};service.filesOnlyScope=outputs.join('. ')+'.';
  copy(service.filesOnlyScope,outputs.map(s=>chineseCopy[s]).join('；')+'。');
  Object.assign(model,{designOnlyPrice:filesPrice,designOnlyCostFloor:Math.round((designLabor+ownerTime)*100)/100,
   designOnlyBasis:copy('The files-only fee is a studio planning assumption. It is not a published provider observation.','仅交付文件的收费为工作室的预算假设，并非供应商公布的价格。'),
   managedShare:.7,managedShareBasis:copy('Unmeasured model prior assigns 70% of accepted quotes to managed print. Replace with your accepted-quote history.','模型暂设 70% 的已接受报价选择代办印刷。请用实际报价记录更新该比例。')});
 }
 if(cadenceDays){service.campaign={cadenceDays,relationshipDays:365};model.campaignPolicy={...service.campaign,basis:paidCycle};}
 model.numericAssumptions={
  price:{value:price,basis:copy('Studio proposal for this bounded delivery. Customer willingness to pay is unmeasured.','建议收费依据约定交付范围设定，客户的实际支付意愿仍待验证。')},
  hours:{value:hours,basis:productionBasis},review:{value:review,basis:copy('Owner time for briefing and checking the deliverables. Quote and delivery time are added by the simulator.','负责人澄清需求、审核交付物所需的时间。模拟器会另计报价和交付工时。')},
  print:{value:supplierCost,basis:printed?spec.printCostBasis:filesDelivery},weight:{value:0,basis:copy('Opt-in offering. Set inquiry share using your intended sales mix.','这是可选服务。请按计划中的业务组合设置询盘占比。')},
  includedRevisions:{value:1,basis:copy('One consolidated feedback round is included in the proposed labor budget.','建议工时包含一轮集中反馈和修改。')},
  printQuantity:{value:spec.printQuantity,basis:printed?spec.printCostBasis:filesDelivery},
  modeledPriceRange:{value:[...range],basis:rangeBasis},modeledPrintCostRange:{value:spec.modeledPrintCostRange,basis:printed?spec.printCostBasis:filesDelivery}
 };
 SERVICES.push(service);DERIVATIONS[id]=model;recommendations[id]={buyer,benefit,inputs,boundary};
}

// Data and decisions
addProposal({
 id:'menu-sales-mix',category:'analytics',audience:'food',price:425,hours:6,review:1.5,sourceIds:[salesSource],
 name:copy('Menu sales mix review','菜单销售结构分析'),buyer:copy('A café owner deciding which items deserve counter space.','正在决定柜台陈列品种的咖啡店主。'),
 benefit:copy('See which items account for units and sales before changing the menu.','调整菜单前，先看各菜品的销量和销售额占比。'),
 inputs:copy('Supply four weeks of item totals for one location, up to 40 items, with refunds marked.','提供一家门店连续四周、不超过 40 个品项的汇总数据，并标出退款。'),
 boundary:copy('Ingredient costing and forecasts require separate work.','食材成本核算与预测需另行安排。'),
 outputs:[copy('Menu mix workbook with unit and sales shares','含销量和销售额占比的菜单分析表'),copy('One-page brief naming two items to test','一页简报，点出两个值得试验的品项')]
});
addProposal({
 id:'product-cost-coverage',category:'analytics',audience:'retail',price:575,hours:8,review:2,sourceIds:[profitSource],
 name:copy('Product margin coverage check','商品毛利数据核查'),buyer:copy('A shop owner reviewing a margin report with missing product costs.','利润报告中存在商品成本缺口的店主。'),
 benefit:copy('Separate usable margin figures from items that still need cost records.','区分可用毛利数据与仍需补录成本的商品。'),
 inputs:copy('Provide sales and dated unit costs for up to 75 SKUs in one period and currency.','提供同一期间、同一币种下最多 75 个 SKU 的销售记录和有日期的单位成本。'),
 boundary:copy('Missing costs remain unknown. Expense allocation and tax accounting are separate.','缺失成本保持待查，费用分摊和税务核算需另行处理。'),
 outputs:[copy('SKU-level cost coverage and gross margin workbook','按 SKU 列示成本覆盖率和毛利的工作簿'),copy('Ranked list of missing or ambiguous cost records','按优先级排列的成本缺失或不明确项目')]
});
addProposal({
 id:'discount-review',category:'analytics',audience:'retail',price:375,hours:5,review:1.5,sourceIds:[salesSource],
 name:copy('Discount code review','折扣码使用复盘'),buyer:copy('A retailer choosing which promotions to repeat.','准备决定保留哪些促销活动的零售商。'),
 benefit:copy('Compare discount depth, use and net sales across codes.','比较各折扣码的优惠幅度、使用次数和净销售额。'),
 inputs:copy('Provide aggregate sales for up to ten codes over eight weeks and their offer rules.','提供八周内最多十个折扣码的销售汇总与活动规则。'),
 boundary:copy('The review describes observed sales. Incremental lift requires a controlled test.','复盘描述实际销售情况；增量效果需通过对照试验验证。'),
 outputs:[copy('Code comparison with discount and sales totals','含优惠额与销售总额的折扣码对比表'),copy('One proposed follow-up test with a success measure','一个附衡量指标的后续测试方案')]
});
addProposal({
 id:'appointment-capacity-review',category:'analytics',audience:'services',price:475,hours:7,review:1.5,
 name:copy('Appointment capacity review','预约容量分析'),buyer:copy('A salon or repair shop with crowded days and empty slots.','部分时段爆满、部分时段空闲的沙龙或维修店。'),
 benefit:copy('See which opening hours attract bookings and where time goes unused.','找出订满的营业时段，以及尚有空余的时间。'),
 inputs:copy('Supply four weeks of anonymous slot totals, booked minutes and opening hours for one team.','提供一个团队四周的匿名时段汇总、已预约分钟数和营业时间。'),
 boundary:copy('Staff scheduling, payroll and changes to the booking system remain with the owner.','排班、工资核算与预约系统调整由店主负责。'),
 outputs:[copy('Weekday and time-block occupancy map','按星期与时段划分的预约占用图'),copy('Two scheduling experiments with a measurement sheet','两项排班试验及记录表')]
});
addProposal({
 id:'channel-sales-brief',category:'analytics',audience:'all',price:525,hours:7.5,review:1.75,sourceIds:[salesSource],
 name:copy('Two-channel sales comparison','双渠道销售对比'),buyer:copy('An owner selling the same range in person and online.','在线上线下销售同一系列商品的店主。'),
 benefit:copy('Identify which products behave differently across the two channels.','找出在两个渠道中表现不同的商品。'),
 inputs:copy('Provide two aggregate item exports for the same month, up to 50 matched products.','提供同一月份两份商品汇总导出表，最多匹配 50 件商品。'),
 boundary:copy('The comparison covers recorded sales. Customer attribution and ad performance are separate.','对比范围为已记录销售；客户归因和广告成效需另行分析。'),
 outputs:[copy('Reconciled two-channel sales table','已核对的双渠道销售对照表'),copy('One channel-specific merchandising test','一项针对单个渠道的商品陈列试验')]
});
addProposal({
 id:'monthly-sales-brief',category:'analytics',audience:'all',price:325,hours:4.5,review:1.25,cadenceDays:30,sourceIds:[salesSource],
 name:copy('Monthly sales decision brief','月度销售决策简报'),buyer:copy('An owner with a consistent monthly sales export and a recurring buying meeting.','每月能导出同格式销售表并定期召开采购会的店主。'),
 benefit:copy('Bring one checked change and one decision to the monthly review.','为月度复盘准备一项已核实的变化和一个待决定的问题。'),
 inputs:copy('Supply two adjacent months from the same agreed report and flag promotions or closures.','提供同一报表中前后两个月的数据，并标记促销和停业时间。'),
 boundary:copy('One report format and one decision per cycle. Data cleanup or a new dashboard is separately scoped.','每期使用一种报表，聚焦一个决策；数据清洗或制作新仪表板需另议。'),
 outputs:[copy('Monthly comparison sheet for three agreed measures','列示三项约定指标的月度对比表'),copy('One-page buying or merchandising brief','一页采购或商品陈列简报')]
});

// Product information and sales materials
addProposal({
 id:'wholesale-line-sheet',category:'catalog',audience:'retail',price:575,hours:9,review:1.5,
 name:copy('Wholesale line sheet','批发选品报价单'),buyer:copy('A small brand preparing to meet its first stockist.','准备与首家经销门店会面的独立品牌。'),
 benefit:copy('Give a buyer the information needed to assemble a first order.','让采购方拿到拟定首单所需的信息。'),
 inputs:copy('Provide approved photos, wholesale prices, case quantities and terms for up to 12 items.','提供最多 12 款商品的定稿图片、批发价、装箱数和交易条款。'),
 boundary:copy('The brand sets pricing and terms. Buyer outreach and order processing are separate.','定价及交易条款由品牌决定；联系买家与订单处理另计。'),
 outputs:[copy('Four-page wholesale PDF with order codes','四页含订货编号的批发 PDF'),copy('Editable item and pricing table','可编辑的商品价格表')]
});
addProposal({
 id:'sku-variant-cleanup',category:'catalog',audience:'retail',price:450,hours:6.5,review:1.5,sourceIds:[productsSource],
 name:copy('Product variant cleanup','商品规格表整理'),buyer:copy('A shop with inconsistent size, color or SKU names across listings.','上架资料中的尺码、颜色或 SKU 命名不统一的店铺。'),
 benefit:copy('Resolve naming conflicts before the next product upload.','在下一次商品上传前处理命名冲突。'),
 inputs:copy('Supply one product export of up to 100 variant rows and the approved naming rules.','提供一份最多 100 条规格记录的商品表和已确认的命名规范。'),
 boundary:copy('Ambiguous rows are flagged for the owner. Live store imports and inventory counts are excluded.','信息不明的记录交店主确认；不含直接导入网店或库存盘点。'),
 outputs:[copy('Clean variant spreadsheet and field map','整理后的商品规格表和字段对照表'),copy('Exception log showing every unresolved match','列出所有未确认匹配项的异常清单')]
});
addProposal({
 id:'product-photo-batch',category:'catalog',audience:'retail',price:295,hours:5,review:1,
 name:copy('Product image standardization','商品图片规格统一'),buyer:copy('A retailer with usable product photos in mismatched crops.','已有可用商品照片但裁切尺寸不一致的零售商。'),
 benefit:copy('Give one collection a consistent scale and framing.','让一个系列的商品图比例和取景保持一致。'),
 inputs:copy('Supply 20 licensed photos from one shoot, an output size and a crop reference.','提供同一次拍摄的 20 张已获授权照片、输出尺寸和裁切示例。'),
 boundary:copy('Complex cutouts, new photography and color-critical matching require a separate brief.','复杂抠图、新拍摄和严格色彩匹配需另议。'),
 outputs:[copy('20 cropped and optimized product images','20 张已裁切优化的商品图片'),copy('Contact sheet indexed by SKU','按 SKU 编号的缩略图索引')]
});
addProposal({
 id:'product-detail-set',category:'catalog',audience:'retail',price:490,hours:7.5,review:1.5,sourceIds:[productsSource],
 name:copy('Product detail page set','商品详情页资料包'),buyer:copy('A shop launching a collection with incomplete product pages.','新品系列即将上线、详情页资料不完整的商店。'),
 benefit:copy('Turn approved specifications into consistent product descriptions and tables.','将已确认的规格整理为统一的商品说明和参数表。'),
 inputs:copy('Provide verified specs, usage notes and photos for six products in one category.','提供同一品类六款商品已核实的规格、使用说明和图片。'),
 boundary:copy('New performance claims, translation and publishing are outside the batch.','本批次不含新增性能宣称、翻译或上线发布。'),
 outputs:[copy('Six product descriptions with feature and size tables','六份含特点及尺寸表的商品说明'),copy('Upload-ready content workbook','可用于录入上架的内容工作簿')]
});
addProposal({
 id:'seasonal-assortment-book',category:'catalog',audience:'retail',price:675,hours:10,review:2,cadenceDays:90,
 name:copy('Seasonal assortment lookbook','季度选品手册'),buyer:copy('A boutique presenting a new assortment to buyers each quarter.','每季度向买家介绍新品组合的精品店。'),
 benefit:copy('Show how seasonal pieces fit together and how to order them.','展示当季商品如何搭配，以及如何订货。'),
 inputs:copy('Supply curated images, approved product facts and item codes for 16 pieces each cycle.','每期提供 16 件商品的精选图片、确认过的资料和货号。'),
 boundary:copy('One digital edition per accepted cycle. Photography, print purchases and distribution are separate.','每次接受报价后制作一期电子手册；拍摄、印刷采购和分发另计。'),
 outputs:[copy('Eight-page seasonal lookbook PDF','八页季度电子选品册'),copy('Order index with image-to-item references','图片与货号对应的订货索引')]
});

// Bilingual production uses approved copy or a named, qualified reviewer.
addProposal({
 id:'bilingual-order-guide',category:'localization',audience:'food',price:480,hours:7,review:2,
 name:copy('Bilingual counter ordering guide','双语柜台点单指南'),buyer:copy('A quick-service restaurant serving English- and Chinese-reading customers.','同时服务中英文顾客的快餐店。'),
 benefit:copy('Make ordering steps and options easy to match in either language.','让顾客用任一语言都能对照点单步骤和选项。'),
 inputs:copy('Supply approved English and Chinese text for 12 ordering choices and name one reviewer for each language.','提供 12 个点单选项的中英文定稿，并为两种语言分别指定审核人。'),
 boundary:copy('This is bilingual layout and proof coordination. Translation, allergen verification and printing are separate.','本项负责双语排版与校样协调；翻译、过敏原核实和印刷另计。'),
 outputs:[copy('Bilingual counter guide in print-ready and mobile sizes','可印刷和手机阅读的双语柜台指南'),copy('Side-by-side proof with item codes for approval','带品项编号的双语对照校样')]
});
addProposal({
 id:'bilingual-care-insert',category:'localization',audience:'retail',price:415,hours:6,review:1.75,
 name:copy('Bilingual care insert','双语养护说明卡'),buyer:copy('A brand shipping one product line to readers in two languages.','向两种语言的顾客销售同一产品系列的品牌。'),
 benefit:copy('Keep care steps and diagrams aligned in both language editions.','让两个语言版本的养护步骤与图示逐项对应。'),
 inputs:copy('Supply approved bilingual care text, a dieline and up to four existing diagrams.','提供已确认的双语养护文案、刀模图及最多四幅现成示意图。'),
 boundary:copy('Client reviewers approve the final wording. Safety certification, translation and physical production are separate.','最终措辞由客户审核人确认；安全认证、翻译和实物制作另计。'),
 outputs:[copy('Two-language care insert with a print-ready PDF','含可印刷 PDF 的双语养护说明卡'),copy('Numbered diagram and text approval proof','带编号的图文确认稿')]
});
addProposal({
 id:'bilingual-appointment-pack',category:'localization',audience:'services',price:435,hours:6.5,review:1.75,
 name:copy('Bilingual appointment messages','双语预约通知模板'),buyer:copy('A neighborhood service team answering appointment questions in two languages.','经常用两种语言回答预约问题的社区服务团队。'),
 benefit:copy('Give front-desk staff a consistent message for each booking stage.','让前台在预约的每个阶段都有一致的通知模板。'),
 inputs:copy('Supply approved English and Chinese copy for booking, reminders and rescheduling with a bilingual reviewer.','提供预约、提醒与改期的中英文定稿，并指定双语审核人。'),
 boundary:copy('Staff send the templates. Translation, personal records and messaging automation are outside scope.','模板由员工发送；不含翻译、个人档案处理或消息自动化配置。'),
 outputs:[copy('Six ready-to-copy message templates in two languages','两种语言的六份可直接复制的消息模板'),copy('One-page staff guide to selecting the right message','一页员工消息选用指南')]
});
addProposal({
 id:'product-terminology-sheet',category:'localization',audience:'retail',price:560,hours:7,review:2.5,
 name:copy('Bilingual product terminology sheet','双语商品术语表'),buyer:copy('A small brand receiving conflicting translations across its catalog.','不同商品资料中译名不统一的小品牌。'),
 benefit:copy('Settle recurring product terms once with the client’s language reviewer.','与客户的语言审核人统一反复出现的商品术语。'),
 inputs:copy('Supply two existing language editions, up to 40 terms and a qualified reviewer for the target market.','提供两个现有语言版本、最多 40 个术语，以及熟悉目标市场的合格审核人。'),
 boundary:copy('Unapproved terms stay flagged. Full translation, legal naming clearance and certification are separate.','未批准的术语保留标记；全文翻译、名称法律审查与认证另计。'),
 outputs:[copy('Reviewed glossary with preferred terms and usage examples','已审核的首选术语及用法示例表'),copy('List of unresolved terms for the next approval meeting','留待下次确认的术语清单')]
});

// Coordination fees buy documents and decisions. The customer buys the goods.
addProposal({
 id:'supplier-quote-matrix',category:'sourcing',audience:'retail',price:525,hours:6.5,review:2.5,sourceIds:[tradeSource],
 name:copy('Supplier quote comparison','供应商报价对比'),buyer:copy('A shop choosing a supplier for one display or packaging item.','正在为一种陈列用品或包装选供应商的商店。'),
 benefit:copy('Compare like-for-like quantities and see which delivered costs remain open.','在相同数量下比较报价，并明确哪些到货成本仍待确认。'),
 inputs:copy('Supply one approved spec, up to three written quotes, destination and required date.','提供一份定稿规格、最多三份书面报价、目的地和要求日期。'),
 boundary:copy('Freight and duties stay unknown until quoted. The buyer contracts with and pays the supplier.','运费与税费在取得报价前保持待定；由买家签约并付款。'),
 outputs:[copy('Quote matrix covering unit price, minimums, tooling and delivery terms','列示单价、起订量、模具费和交付条件的对比表'),copy('Supplier-specific questions for missing cost or timing terms','按供应商列出的成本和交期追问清单')]
});
addProposal({
 id:'sample-review-brief',category:'sourcing',audience:'retail',price:410,hours:5,review:2,
 name:copy('Supplier sample review brief','供应商样品评审简报'),buyer:copy('A buyer comparing two samples before placing a production order.','准备下生产订单、需要对比两件样品的买家。'),
 benefit:copy('Turn visible sample differences into clear changes for the supplier.','将样品可见的差异整理成供应商可以执行的修改项。'),
 inputs:copy('Supply one approved spec, labeled photos and measurements for two client-purchased samples.','提供一份定稿规格、两件客户自购样品的标注照片和测量数据。'),
 boundary:copy('Desk review of supplied evidence only. Testing, factory inspection, samples and shipping are client arrangements.','仅依据客户材料进行案头评审；检测、验厂、样品采购及运输由客户安排。'),
 outputs:[copy('Photo comparison against six agreed acceptance points','针对六项约定验收点的图片对比表'),copy('Revision request and open questions for one supplier','给一家供应商的修改要求与待答问题')]
});
addProposal({
 id:'packaging-rfq',category:'sourcing',audience:'all',price:475,hours:6.5,review:2,
 name:copy('Packaging quote request pack','包装询价资料包'),buyer:copy('A maker getting incomparable prices for a new carton or sleeve.','不同厂家对同一纸盒或封套报价难以比较的小品牌。'),
 benefit:copy('Give suppliers the same specification and questions before they quote.','让供应商按统一规格与问题报价。'),
 inputs:copy('Supply one approved pack format, dimensions, stock preference, three volume breaks and a destination.','提供一种确认的包装形式、尺寸、材料偏好、三个数量档和目的地。'),
 boundary:copy('The buyer approves engineering and places orders. Dieline development, samples and freight are separate.','买家负责结构确认及下单；刀模开发、样品和运费另计。'),
 outputs:[copy('One packaging specification and quote request PDF','一份包装规格及询价 PDF'),copy('Reply sheet for three quantity breaks and setup charges','含三个数量档与开办费用的报价回填表')]
});

// Appointment, project and maintenance businesses
addProposal({
 id:'service-comparison-sheet',category:'client-experience',audience:'services',price:335,hours:5,review:1.25,
 name:copy('Service tier comparison sheet','服务档位对比单'),buyer:copy('A service business whose prospects keep asking which package to choose.','潜在客户经常询问如何选择服务档位的商家。'),
 benefit:copy('Show the differences in price, inclusions and booking requirements at a glance.','让客户一眼看清价格、服务内容与预约条件的差别。'),
 inputs:copy('Supply approved pricing and scope for three tiers of one service.','提供同一服务三个档位的定稿价格与范围。'),
 boundary:copy('One comparison sheet. Pricing strategy, contract language and website changes are separate.','交付一张对比单；定价策略、合同文本和网站修改另计。'),
 outputs:[copy('One-page service tier comparison in PDF and editable format','一页服务档位对比单，含 PDF 和可编辑版本'),copy('Three short booking prompts matched to the tiers','三个与档位对应的简短预约提示')]
});
addProposal({
 id:'first-visit-pack',category:'client-experience',audience:'services',price:395,hours:6,review:1.5,
 name:copy('First-visit welcome pack','首次到访指南'),buyer:copy('An appointment business fielding repeated questions before a first visit.','顾客首次到访前反复询问同类问题的预约制商家。'),
 benefit:copy('Give new customers one place to check what to bring and what happens next.','让新顾客一次查清随身物品和到店流程。'),
 inputs:copy('Supply the visit sequence, directions, preparation list and cancellation policy for one location.','提供一个地点的到访流程、路线、准备清单和取消政策。'),
 boundary:copy('The owner approves policies and sends the materials. Booking integrations are separately scoped.','政策由店主确认，资料由店主发送；预约系统对接另议。'),
 outputs:[copy('Two-page welcome guide for phone and print','两页手机及打印版到访指南'),copy('Confirmation email with a preparation checklist','附准备清单的预约确认邮件模板')]
});
addProposal({
 id:'project-case-study',category:'client-experience',audience:'services',price:585,hours:8,review:2.25,
 name:copy('Completed project case study','已完项目案例册'),buyer:copy('A contractor or studio bidding for work similar to a successful project.','准备竞标同类项目的承包商或工作室。'),
 benefit:copy('Show a prospect the original brief, the work delivered and the verified result.','向潜在客户展示原始需求、实际交付和经核实的结果。'),
 inputs:copy('Supply one approved client story, up to six licensed images and verified outcome figures.','提供一个客户已批准的案例、最多六张授权图片和核实过的成果数据。'),
 boundary:copy('The customer clears permissions and claims. New interviews and photography are separate.','授权和成果表述由客户确认；重新采访和摄影另计。'),
 outputs:[copy('Two-page project case study PDF','两页项目案例 PDF'),copy('Web-ready case text with three captioned images','可用于网站的案例文稿及三张配说明图片')]
});
addProposal({
 id:'seasonal-maintenance-notice',category:'recurring',audience:'services',price:465,hours:5.5,review:1.5,printLike:'postcard-250',filesPrice:315,cadenceDays:90,
 name:copy('Seasonal maintenance reminder','季度保养提醒卡'),buyer:copy('A home-service business opening seasonal maintenance appointments.','按季开放保养预约的上门服务商。'),
 benefit:copy('Give past customers a timely reminder and a clear way to book.','按季提醒老客户，并给出清楚的预约方式。'),
 inputs:copy('Supply one seasonal service, approved dates, one booking link and brand assets per cycle.','每期提供一项季节性服务、确认日期、一个预约链接和品牌素材。'),
 boundary:copy('One one-sided 4×6 design. Mailing lists, postage and distribution remain with the customer.','每期一款 4×6 英寸单面设计，名单、邮资和分发由客户负责。'),
 outputs:[copy('Print-ready maintenance reminder postcard','可直接印刷的保养提醒明信片'),copy('Phone-size reminder image with the booking link in accompanying text','手机尺寸提醒图及含预约链接的配套文字')]
});

// Food service beyond the everyday menu
addProposal({
 id:'catering-sales-sheet',category:'menu',audience:'food',price:650,hours:7,review:1.75,printLike:'takeout-menus-100',filesPrice:395,
 name:copy('Catering inquiry kit','餐饮外烩询价包'),buyer:copy('A caterer spending time on event inquiries that lack guest counts or dates.','常收到缺少人数或日期的活动询价的外烩商家。'),
 benefit:copy('Help organizers compare three catering options and request a usable quote.','帮助活动主办方比较三种餐饮方案，并提交信息齐全的询价。'),
 inputs:copy('Supply three catering packages, minimums, lead times and approved contact details.','提供三个外烩套餐、起订量、提前预订时间及确认过的联系方式。'),
 boundary:copy('One unfolded letter-size sheet. The caterer confirms pricing and dietary information.','单张美式信纸尺寸、无折页；价格及饮食相关信息由餐饮商核实。'),
 outputs:[copy('Catering package comparison PDF','外烩套餐对比 PDF'),copy('Five-question event inquiry template','包含五个问题的活动询价模板')]
});
addProposal({
 id:'counter-screen-loop',category:'visibility',audience:'food',price:355,hours:5.5,review:1.25,
 name:copy('Counter screen menu loop','柜台屏幕菜单轮播'),buyer:copy('A café with an existing counter screen and several changing dayparts.','已有柜台屏幕、分时段供餐的咖啡馆。'),
 benefit:copy('Make breakfast, lunch and afternoon offers readable from the queue.','让排队顾客看清早餐、午餐和下午时段的供应内容。'),
 inputs:copy('Supply screen dimensions, playback format and approved content for three dayparts.','提供屏幕尺寸、播放格式和三个时段的定稿内容。'),
 boundary:copy('One screen size and silent playback. Hardware, player configuration and video shoots are separate.','面向一种屏幕尺寸、无声播放；硬件、播放器配置及拍摄另计。'),
 outputs:[copy('Three static menu slides and one silent looping MP4','三张菜单静态画面及一个无声循环 MP4'),copy('Playback order and export settings sheet','播放顺序与导出设置表')]
});
addProposal({
 id:'event-booking-pack',category:'offer',audience:'food',price:525,hours:7.5,review:1.75,
 name:copy('Private dining booking pack','包场用餐预订资料包'),buyer:copy('A restaurant converting private-room inquiries into site visits.','希望将包间询价推进到现场看场的餐厅。'),
 benefit:copy('Show organizers the room, capacity and next step before they call.','让主办方在来电前了解场地、容量和下一步安排。'),
 inputs:copy('Supply approved room photos, capacities, minimum spend and booking process for one venue.','提供一家门店的已批准场地照、容量、最低消费和预订流程。'),
 boundary:copy('Floor plans are illustrative. Contracts, deposit collection and booking software are separate.','场地平面图仅作示意；合同、订金收取和预订系统另计。'),
 outputs:[copy('Four-page venue and package deck','四页场地及套餐介绍文件'),copy('Inquiry reply with a site-visit invitation','附看场邀请的询价回复模板')]
});
addProposal({
 id:'seasonal-preorder-kit',category:'recurring',audience:'food',price:425,hours:6,review:1.5,cadenceDays:90,
 name:copy('Seasonal preorder kit','季度预订活动包'),buyer:copy('A bakery taking advance orders for a limited seasonal range.','为限量季节系列接受预订的烘焙店。'),
 benefit:copy('Make products, cutoff dates and pickup windows clear before orders open.','在开始接单前说明商品、截止日期和取货时段。'),
 inputs:copy('Supply up to eight products, approved prices and images, cutoff dates and a working order link each cycle.','每期提供最多八款商品的定稿价格和图片、截止日期及可用的订购链接。'),
 boundary:copy('One preorder window per accepted cycle. Payment processing, printing and order handling are separate.','每次接受报价后制作一期预订资料；收款、印刷和订单处理另计。'),
 outputs:[copy('One-page seasonal preorder menu','一页季节性预订菜单'),copy('Launch and last-call graphics with pickup instructions','开售及截止提醒图，附取货说明')]
});

// Add decision context beside the legacy packages without changing their saved terms.
function describeOriginal(id,buyer,inputs,boundary){
 const original=SERVICES.find(service=>service.id===id);
 recommendations[id]={buyer,benefit:original.goal,inputs,boundary};
}
describeOriginal('digital-flyer',copy('A local business announcing one sale or event online.','准备在线上发布一次优惠或活动的本地商家。'),copy('Provide the final headline, offer terms, logo and one approved image.','提供定稿标题、活动条款、标志和一张已批准图片。'),copy('One layout in two sizes. The client posts it and buys any advertising.','一款设计输出两种尺寸，客户负责发布及购买广告。'));
describeOriginal('postcard-250',copy('A shop distributing a small batch of offers in the neighborhood.','准备在社区派发小批量优惠卡的店铺。'),copy('Provide a single offer, approved contact details and a distribution plan.','提供一项优惠、确认过的联系方式和分发计划。'),copy('One-sided artwork. Lists, postage and delivery to homes are separate.','单面设计；地址名单、邮资和派送入户另计。'));
describeOriginal('table-tents-100',copy('A café introducing one extra item at seated tables.','准备在餐桌上推荐一款加购品的咖啡馆。'),copy('Confirm the promoted item, final price, image and printer template.','确认推广品项、最终价格、图片和印厂模板。'),copy('One promotion on one tent format. A custom structure needs a separate quote.','一种桌牌形式用于一个活动；定制结构需单独报价。'));
describeOriginal('menu-refresh',copy('A restaurant with an existing menu and approved new dishes or prices.','已有菜单并已确认新菜品或价格的餐厅。'),copy('Send the current menu source, final copy, prices and brand files.','提供现有菜单源文件、定稿文案、价格和品牌文件。'),copy('Two pages of layout. Recipe costing, copywriting and printing are separate.','两页排版；菜品成本核算、撰稿和印刷另计。'));
describeOriginal('takeout-menus-100',copy('A restaurant that needs take-home menus for its counter.','需要在柜台提供可带走菜单的餐厅。'),copy('Provide approved items, prices, order details and the agreed paper format.','提供确认过的菜品、价格、订购方式及纸张规格。'),copy('Confirm folding and finishing with the printer before promising a finished batch.','承诺成品批次前，请向印厂确认折页及后加工要求。'));
describeOriginal('window-promo-12sf',copy('A street-facing shop with a single display window and a time-limited offer.','有一扇展示橱窗并准备推出限时优惠的临街商店。'),copy('Supply verified dimensions, a window photo and approved promotional text.','提供核实的尺寸、橱窗照片和定稿促销文案。'),copy('The quote covers one rectangular graphic. Site measurement and installation are separate.','报价覆盖一款矩形橱窗图形；现场测量和安装另计。'));
describeOriginal('brand-starter',copy('An independent owner opening with a name and an agreed brief.','已确定名称及设计需求、准备开业的独立店主。'),copy('Supply the approved name, audience, references and a single decision maker.','提供已确认的名称、目标客群、参考资料并指定一名决策人。'),copy('One developed direction. Naming, trademark work and a full identity system are separate.','深化一个方向；命名、商标工作和完整识别系统另计。'));
describeOriginal('social-pack-4',copy('A business with an upcoming promotion and a person ready to post.','已准备促销活动并有专人负责发布的商家。'),copy('Supply the final message, platform size, four approved images and publish dates.','提供定稿信息、平台尺寸、四张已批准图片和发布日期。'),copy('Four static posts. Publishing, comments and media buying remain with the client.','四张静态贴文图片；客户负责发布、评论和广告投放。'));
describeOriginal('poster-pack-25',copy('A business displaying the same offer at several local spots.','准备在多个本地点位展示同一优惠的商家。'),copy('Confirm the offer, viewing distance, artwork size and available printer stock.','确认促销内容、观看距离、画面尺寸和可用纸材。'),copy('One poster design. Placement permissions and installation are separate.','一款海报设计；许可和安装另计。'));
describeOriginal('monthly-promo-5',copy('A merchant with a different approved offer every month.','每月都有一项已确定推广活动的商家。'),copy('Supply the monthly message, images, offer dates and working destination URL.','每月提供活动文案、图片、有效日期和可用的网址。'),copy('One batch per accepted cycle. Hosting, publishing and performance reporting are separate.','每次接受报价后制作一批；托管、发布和效果报告另计。'));
describeOriginal('seasonal-campaign',copy('A storefront planning coordinated print and digital promotions each season.','每季需要协调印刷与数字推广资料的门店。'),copy('Confirm a seasonal offer, a campaign image, dates and destination URL.','确认季节性活动、一张主图、活动日期和目标网址。'),copy('One accepted quote per seasonal cycle. Installation and paid media are separate.','每个季度单独接受报价；安装和付费媒体另计。'));
const FEATURED_IDS=['menu-sales-mix','wholesale-line-sheet','service-comparison-sheet','bilingual-order-guide','supplier-quote-matrix','monthly-sales-brief','seasonal-assortment-book','catering-sales-sheet'];
// Each slot serves a different client decision. Its first option is the
// starting recommendation. Alternatives are scoped packages in the same catalog.
const option=(id,reason,reasonZh)=>({id,why:copy(reason,reasonZh)});
const slot=(id,label,labelZh,options)=>({id,label:copy(label,labelZh),options});
const CLIENT_MENUS=[
 {
  id:'restaurant',name:copy('Independent restaurant','独立餐厅'),audience:'food',
  description:copy('An owner has item sales and a menu change coming up.','店主手里有菜品销售记录，近期准备调整菜单。'),
  slots:[
   slot('decide','Choose what to feature','选出主推菜品',[
    option('menu-sales-mix','Four weeks of item sales give the owner two dishes to test before paying for a menu change.','先用四周的菜品销售数据挑出两道值得测试的菜，再决定这次菜单改什么。'),
    option('monthly-sales-brief','Use two comparable months when the owner already tracks the same measures and needs one decision for the next menu.','如果店主一直在跟踪相同指标，可用相邻两个月的数据，定下次菜单调整的一个重点。')
   ]),
   slot('menu','Update the menu','更新菜单',[
    option('menu-refresh','The kitchen can keep its existing two-page format while you bring the chosen dishes and approved prices into focus.','沿用现有的两页版式，突出选定的菜品，并使用店主确认的价格。'),
    option('takeout-menus-100','Choose a takeout edition when customers need a menu to bring home. The client can order a batch or arrange printing.','如果顾客需要带走菜单，就做外带版。客户可订一批印刷品，也可自行印刷。'),
    option('counter-screen-loop','For orders placed at a counter, three slides put the approved choices on the screen guests already use.','如果顾客在柜台点餐，可用三张画面把确认好的菜品放到现有屏幕上。')
   ]),
   slot('promote','Put the dish in front of guests','展示主推菜品',[
    option('table-tents-100','One table tent can test the featured dish where seated guests are deciding what to order.','桌卡可以在顾客落座点餐时展示主推菜，便于测试这道菜的反响。'),
    option('digital-flyer','For pickup traffic, give the restaurant one digital feature it can share alongside its ordering link.','外带订单较多时，可交付一张促销图，让餐厅和点餐链接一起分享。'),
    option('social-pack-4','Four coordinated posts suit a timed special when the restaurant has photos, posting dates and someone to publish them.','如果限时菜品已有照片、发布日期和发布人员，可提供四张风格一致的社交媒体图片。')
   ])
  ]
 },
 {
  id:'counter-service',name:copy('Bilingual café','双语咖啡馆'),audience:'food',
  description:copy('A counter team helps guests order in English and Chinese.','柜台员工需要用中英文帮助顾客点单。'),
  slots:[
   slot('explain','Explain ordering choices','说明点单选项',[
    option('bilingual-order-guide','With approved English and Chinese wording, a counter guide gives guests and staff the same names for 12 ordering choices.','中英文文案定稿后，一份柜台指南就能让顾客和员工对十二个点单选项使用相同的说法。'),
    option('menu-refresh','If the café already has a bilingual guide, refresh the two-page price menu the team hands to guests.','如果咖啡馆已有双语指南，可改为更新员工递给顾客的两页价目菜单。')
   ]),
   slot('counter','Feature a counter special','推出柜台特选',[
    option('counter-screen-loop','On an existing screen, rotate three approved daypart slides so guests can spot the current special before reaching the till.','在现有屏幕上轮播三个时段的画面，让排队的顾客在到收银台前就看到当前特选。'),
    option('table-tents-100','When guests wait at tables, use a single tabletop promotion for the seasonal drink or snack the staff want to feature.','如果顾客常坐在桌边等候，可用一款桌卡主推店员想推荐的季节饮品或点心。')
   ]),
   slot('orders','Take advance orders','承接提前预订',[
    option('seasonal-preorder-kit','For a holiday pickup window, give returning guests the item list, cutoff and the café’s own order link.','节日自提开放时，让回头客一次看到商品、截止日期和店铺现有的下单链接。'),
    option('catering-sales-sheet','If offices ask about group lunches, a sheet with three catering packages lets staff quote from agreed minimums and lead times.','附近办公室常问团餐时，可列出三种套餐以及确认的起订量和预订时限，方便员工接洽。')
   ])
  ]
 },
 {
  id:'wholesale',name:copy('Wholesale product brand','批发商品品牌'),audience:'retail',
  description:copy('A brand has a collection and a meeting with a retail buyer.','品牌已备好系列商品，即将与零售买手会面。'),
  slots:[
   slot('data','Get product facts ready','整理商品资料',[
    option('sku-variant-cleanup','Match each size and color to an order code before those codes appear on a buyer’s order sheet.','先把尺码、颜色与订货编号一一对应，再让这些编号出现在给买手的订货资料里。'),
    option('product-terminology-sheet','For a collection sold in two languages, reconcile approved names with a reviewer before the brand presents it to buyers.','系列商品以两种语言销售时，先与审核人统一已经确认的名称，再用于向买手展示的资料。')
   ]),
   slot('presentation','Prepare the collection','准备系列展示资料',[
    option('product-photo-batch','Standardize 20 supplied images so buyers can compare products by shape and detail across the collection.','统一处理客户提供的二十张图片，让买手可以比较不同商品的外形和细节。'),
    option('product-detail-set','If photos are ready, give sales staff verified size and feature descriptions for six products buyers ask about.','如果图片已备齐，可为买手常问的六件商品整理经过核实的尺寸与特点，供销售人员使用。')
   ]),
   slot('sell','Equip the buyer','给买手订货依据',[
    option('wholesale-line-sheet','A four-page PDF pairs up to 12 products with codes, case quantities and wholesale terms so a buyer can prepare a first order.','四页 PDF 将最多十二件商品与编号、箱规和批发条款对应，买手可据此准备首单。'),
    option('seasonal-assortment-book','For a seasonal buying appointment, present 16 selected pieces in a lookbook the buyer can use to shortlist the range.','如果按季约见买手，可用一本型录展示十六件精选商品，帮助买手圈定意向款。')
   ])
  ]
 },
 {
  id:'retailer',name:copy('Neighborhood retailer','社区零售店'),audience:'retail',
  description:copy('A shop owner is choosing which products to promote locally.','店主正挑选适合向周边顾客推广的商品。'),
  slots:[
   slot('decide','Choose the promotion','选定促销重点',[
    option('product-cost-coverage','Check which items have usable unit costs before the owner commits window space to a price promotion.','在店主决定用橱窗推特价前，先核对哪些商品的单位成本有可靠记录。'),
    option('discount-review','When the shop has run several codes, compare recorded sales and discounts to choose which offer deserves another test.','如果店铺用过多个优惠码，可比较实际记录的销售额和折扣，再决定哪种优惠值得再试。'),
    option('channel-sales-brief','With matching store and online reports, compare product sales across the two channels to choose what to feature locally.','若店内与线上报表的商品可对应，可比较两个渠道的销量，决定线下主推什么。')
   ]),
   slot('display','Show it in the shop','在店内外展示',[
    option('window-promo-12sf','One window graphic gives passing customers a specific reason to come in once the owner approves the offer and dimensions.','优惠和尺寸敲定后，用一张橱窗画面给路过的顾客一个具体的进店理由。'),
    option('poster-pack-25','Use one poster design when the offer needs to appear by the shelf, the register or several approved neighborhood locations.','如果货架、收银台或周边多个获准点位都要展示优惠，可用同一款海报。')
   ]),
   slot('reach','Reach shoppers before the visit','让顾客来店前看到优惠',[
    option('social-pack-4','Give the shop four static posts carrying the same offer and dates as the store display for its own social channels.','给店铺四张社交媒体图片，优惠内容和日期与店内展示保持一致，供店铺自行发布。'),
    option('postcard-250','When local partners can distribute cards, a printed batch gives shoppers the promotion and address to take home.','周边合作商户可以分发卡片时，一批印刷明信片就能让顾客把优惠和地址带回家。')
   ])
  ]
 },
 {
  id:'maker',name:copy('Maker sourcing packaging','正在采购包装的品牌'),audience:'retail',
  description:copy('A small brand is choosing packaging for its next production run.','小品牌正在为下一批产品挑选包装。'),
  slots:[
   slot('spec','Clarify the specification','明确采购规格',[
    option('packaging-rfq','Turn the buyer’s approved dimensions, stock and volume breaks into one request so suppliers price the same pack.','将买方确认的尺寸、材质和数量档位整理成一份询价单，让供应商针对同一款包装报价。'),
    option('product-terminology-sheet','If the specification exists in two languages, have a reviewer reconcile material and finish terms before suppliers respond.','若已有双语规格，可请审核人先统一材质与表面处理术语，减少各家供应商理解上的偏差。')
   ]),
   slot('cost','Compare the costs','核对成本',[
    option('supplier-quote-matrix','Line up as many as three written quotes against that specification and flag freight or tooling the buyer still needs priced.','按同一规格对照最多三份书面报价，标出买方还需确认报价的运费或模具费。'),
    option('product-cost-coverage','Once the supplier is chosen and unit costs are recorded, show which products have enough cost data to evaluate their margins.','如果供应商已选定且单位成本已有记录，可检查哪些商品的数据足以核算毛利。')
   ]),
   slot('sample','Review the pack before production','在量产前核对包装',[
    option('sample-review-brief','Compare the buyer’s photos and measurements for two samples against six agreed points before they place the production order.','在买方下量产订单前，按六项约定标准对照两个样品的照片和尺寸记录。'),
    option('bilingual-care-insert','If the sample is approved, fit the brand’s signed-off care copy to its dieline and return a bilingual proof for review.','若样品已确认，可把品牌定稿的双语养护说明排入刀模，并交回校样供审核。')
   ])
  ]
 },
 {
  id:'appointments',name:copy('Appointment-based studio','预约制工作室'),audience:'services',
  description:copy('A salon or studio wants clients to book the right service and arrive prepared.','沙龙或工作室希望顾客能选对服务，并在到店前做好准备。'),
  slots:[
   slot('capacity','Find the booking opportunity','找出可利用的预约时段',[
    option('appointment-capacity-review','Four weeks of anonymous booking totals reveal quiet time blocks the owner can make available for a particular service.','用四周的匿名预约汇总找出较空闲的时段，便于店主决定要在哪些时段开放某项服务。'),
    option('monthly-sales-brief','If the owner has a stable monthly report, track three agreed measures to decide which service to focus on next.','如果店主已有稳定的月报，可跟踪三个约定指标，决定接下来重点经营哪项服务。')
   ]),
   slot('choice','Help clients choose','帮助顾客选服务',[
    option('service-comparison-sheet','Show the price and inclusions of three tiers before clients book, so staff can point them to the right appointment.','在顾客预约前展示三档服务的价格和包含项目，让员工能引导顾客预约合适的服务。'),
    option('project-case-study','When the studio sells one specialist service, a permission-cleared client story helps prospects see what that appointment delivers.','如果工作室主打一项专业服务，可以用一个已获授权的客户案例说明这项服务的实际结果。')
   ]),
   slot('visit','Prepare for the visit','做好到店准备',[
    option('first-visit-pack','Once a client books, staff can send one guide with directions, the visit sequence and the studio’s preparation instructions.','预约后，员工可发送一份指南，列明路线、到店流程和工作室要求的准备事项。'),
    option('bilingual-appointment-pack','For a two-language front desk, turn approved wording into six messages staff can use for bookings, reminders and changes.','双语前台可将已确认的中英文文案整理成六条模板，供员工处理预约、提醒和改期。')
   ])
  ]
 },
 {
  id:'home-services',name:copy('Home service business','上门服务商家'),audience:'services',
  description:copy('A local crew is booking its next season of work in customers’ homes.','本地服务团队正在安排下一季的上门订单。'),
  slots:[
   slot('trust','Show homeowners the work','向住户展示服务内容',[
    option('project-case-study','One approved local job gives homeowners a concrete example of the crew’s process and the outcome before they request a quote.','通过一个已获授权的本地项目，在住户询价前展示团队的实际流程和成果。'),
    option('service-comparison-sheet','For standardized visits, compare three approved tiers so homeowners understand the work included before requesting a booking.','如果上门服务比较标准化，可列出已确认的三档套餐，让住户在预约前知道各自包含哪些工作。')
   ]),
   slot('season','Open the seasonal booking window','开放当季预约',[
    option('seasonal-maintenance-notice','When service dates are set, a reminder postcard and phone image give past customers the window and booking link in one place.','服务日期确定后，可用提醒明信片和手机版图片，把当季预约时段与链接一并发给老客户。'),
    option('digital-flyer','If the crew has one immediate opening or service promotion, a single digital layout gives it something it can share today.','若团队要宣传一次近期空档或单项活动，一张电子宣传图即可供其当天分享。')
   ]),
   slot('review','Plan the next booking window','安排下一轮预约',[
    option('appointment-capacity-review','Use four weeks of booked minutes and opening hours to see which time blocks filled before the crew releases its next dates.','在团队开放下一批日期前，用四周的预约时长和营业时间核对哪些时段已经排满。'),
    option('monthly-sales-brief','When jobs are tracked by month, use the same report for two adjacent months to decide which seasonal service to offer again.','若订单按月记录，可用同一份报表比较相邻两个月，决定下一轮要继续推出哪项季节服务。')
   ])
  ]
 }
];
// Each channel points to a role in the client's menu. The editor supplies the
// actual offer in that role, including a swap or a customized service name.
const channel=(id,slot,title,where,approach)=>({id,slot,title,where,approach});
const CLIENT_REACH={
 restaurant:{
  channels:[
   channel('owner-visit',0,copy('Visit between services','在非用餐高峰拜访'),
    copy('An owner or general manager preparing a menu change.','正准备更新菜单的店主或总经理。'),
    copy('Ask which dish they are deciding whether to feature, and what sales figures they use. If that question is still open, offer to scope a review of one period.','询问对方正在考虑主推哪道菜，平时参考哪些销售数据。如果还没定下来，可商量分析一个时段的数据。')),
   channel('printer-intro',1,copy('Ask a menu printer for an introduction','请菜单印刷商引荐'),
    copy('A local printer whose restaurant customer is about to change dishes or prices.','本地印刷商，以及准备更换菜品或调价的餐厅客户。'),
    copy('Ask for an introduction when the owner has a revision date. Find out where guests will read the new menu and who approves the final prices before quoting.','请印刷商在店主确定改版日期后引荐。报价前先问清顾客会在哪里看菜单，以及由谁确认最终价格。')),
   channel('food-event',2,copy('Meet restaurants planning a local event','结识筹备街区活动的餐厅'),
    copy('Participating owners at a neighborhood food event or a merchant planning meeting.','参加街区美食活动或商户筹备会的餐厅负责人。'),
    copy('Ask which special they want guests to order, where it will be seen, and when it goes live. Use those answers to propose one promotional piece.','询问对方想推广哪道特餐、顾客会在哪里看到、何时推出。根据这些信息提议制作一款推广物料。'))
  ],
  measurement:copy('Count a new restaurant inquiry when the owner asks about price, timing or scope for a specific menu decision. Compare that count with all qualified new inquiries in the same period.','店主针对一次具体的菜单调整询问价格、排期或范围时，记为一条新餐厅询盘。用这一数量与同期所有有效新询盘比较。')
 },
 'counter-service':{
  channels:[
   channel('counter-visit',0,copy('Observe an off-peak ordering shift','在非高峰时段了解点单流程'),
    copy('A café owner or shift lead serving guests in English and Chinese.','使用中英文接待顾客的咖啡馆店主或值班主管。'),
    copy('Ask which choice staff most often have to explain twice. Invite the owner to walk through that part of the menu and identify who can approve the wording.','询问员工哪项点单选择最常需要重复解释。请店主一起看这部分菜单，并确认由谁核定文案。')),
   channel('roaster-intro',1,copy('Ask a roaster about a seasonal launch','从烘焙商了解季节饮品上新'),
    copy('A roaster or beverage supplier working on a launch with a café.','正与咖啡馆筹备新品上市的咖啡烘焙商或饮品供应商。'),
    copy('Ask for an introduction to the person setting the launch date. Find out where customers wait to order and what they should see before reaching the till.','请供应商引荐安排上新日期的负责人。问清顾客在哪里等候点单，以及走到收银台前需要看到什么信息。')),
   channel('popup-organizer',2,copy('Meet café vendors at a pop-up','在快闪活动结识咖啡商家'),
    copy('A café taking advance orders for a community event, office lunch or holiday pickup.','为社区活动、办公室午餐或节日自提接受预订的咖啡馆。'),
    copy('Ask the vendor what buyers must decide before the cutoff. Offer to turn one event’s dates, quantities and collection details into an order guide.','问商家顾客在截止前必须确认哪些事项。提议把一场活动的日期、数量和取餐安排整理成订购说明。'))
  ],
  measurement:copy('Record a café once when the operator identifies an ordering problem or launch date and asks for a proposal. Record guest questions separately from studio inquiries.','经营者指出具体的点单问题或上新日期，并提出方案需求时，将该店记为一条询盘。顾客在柜台提出的问题单独记录。')
 },
 wholesale:{
  channels:[
   channel('showroom',0,copy('Talk to a showroom rep','与展厅销售代表交流'),
    copy('A sales rep preparing an independent brand’s range for buyer appointments.','正为独立品牌准备买手会面的销售代表。'),
    copy('Ask which product detail buyers keep sending back for clarification. Request an introduction to the founder who can approve the codes and product names.','问销售代表买手最常要求核实哪项商品信息，请其引荐能确认货号和品名的品牌负责人。')),
   channel('photo-studio',1,copy('Partner with a product photographer','与商品摄影师合作'),
    copy('A photographer handing a finished collection shoot back to a brand.','即将把系列商品照片交付给品牌的摄影师。'),
    copy('Ask whether the brand has matched its approved photos to the right variants. Walk through one image and order code together so you can price the whole batch.','了解品牌是否已把定稿照片与商品款式一一匹配。先一起核对一张图片和对应的订货编号，再为整批工作报价。')),
   channel('buyer-preview',2,copy('Find brands preparing a buyer preview','寻找正筹备买手预览的品牌'),
    copy('Founders exhibiting a collection at a trade preview or maker showroom.','在订货预览或创作者展厅展示新系列的品牌创始人。'),
    copy('Ask what a retailer takes away after the meeting and how they place the first order. A confirmed buying date gives the sales material a real deadline.','询问零售买手会后能带走什么资料、如何下首单。已确定的订货日期可以作为销售资料的交付期限。'))
  ],
  measurement:copy('Log a brand inquiry when there is a named collection, a buyer deadline and a request to quote. Count the same brief once even if the photographer and rep both introduce it.','有明确商品系列、买手截止日期并要求报价时，记为一条品牌询盘。即使摄影师和销售代表都作了引荐，同一需求也只计一次。')
 },
 retailer:{
  channels:[
   channel('merchants-meeting',0,copy('Join a shop-owner discussion','参加店主交流会'),
    copy('Merchants deciding what to promote during the next trading period.','正决定下一销售周期推广商品的零售商家。'),
    copy('Ask what happened during their last promotion and which question their sales report left open. Offer to investigate one question using an agreed period.','询问上次促销的情况，以及销售报表留下了哪个未解的问题。可提议在约定时段内研究其中一个问题。')),
   channel('sign-shop',1,copy('Seek introductions from a sign shop','请招牌制作商引荐'),
    copy('A sign maker measuring a shop window for a dated promotion.','正在为定期促销测量门店橱窗的招牌制作商。'),
    copy('Ask to meet the owner before artwork is due. Confirm the display position, offer dates and available measurements so you can quote a piece that fits.','请其在画稿截止前引荐店主。确认展示位置、促销日期和已有尺寸，以便为合适的物料报价。')),
   channel('shopping-event',2,copy('Plan around a shopping event','从街区购物活动切入'),
    copy('A retailer named in an upcoming neighborhood shopping event.','已参加下一场街区购物活动的零售店。'),
    copy('Ask how customers will hear about the event before they visit. Work from one approved offer, a distribution plan and the date the owner needs the artwork.','问店主顾客在到店前如何得知活动。从一项已确认的优惠、分发安排和画稿交付日期开始讨论。'))
  ],
  measurement:copy('Separate conversations with shoppers from owners asking for help with an actual promotion. Track the source and deadline of each new shop brief.','将顾客咨询与店主针对实际促销提出的需求分开。记录每个新门店需求的来源和截止日期。')
 },
 maker:{
  channels:[
   channel('converter-referral',0,copy('Meet a packaging estimator','结识包装厂报价人员'),
    copy('A carton or label supplier receiving incomplete requests from small brands.','经常收到小品牌不完整询价资料的纸盒或标签供应商。'),
    copy('Ask which specification or product term is holding up a quote. Request an introduction to the brand so it can approve that detail before suppliers price the work.','询问是哪项规格或产品术语影响报价，请供应商引荐品牌负责人，在各家核价前确认该细节。')),
   channel('maker-workshop',1,copy('Compare a real purchasing decision','围绕一次实际采购交流'),
    copy('A maker at a production workshop who is pricing the next batch.','正在生产交流活动中筹算下一批成本的品牌主理人。'),
    copy('Ask which costs they can verify for one order and which figures are still missing. Identify one decision you could help them make before a purchase commitment.','问对方一笔订单中哪些成本已有依据、哪些数字还缺失。在承诺采购前，找出一个你能协助判断的问题。')),
   channel('launch-partner',2,copy('Reconnect before a packaging approval','在包装定稿前联系项目伙伴'),
    copy('A brand designer or launch coordinator whose client is about to approve packaging.','客户即将确认包装的品牌设计师或上市项目协调人。'),
    copy('Ask who signs off the next proof or sample and on what date. Discuss a bounded review or insert with the person responsible for that approval.','问清下一份校样或样品由谁签字、何时定稿。和该负责人讨论一次范围明确的评审，或一张随包装附上的说明卡。'))
  ],
  measurement:copy('Count a brand requesting a fee for help on a defined packaging job. A supplier sending its own price list is a source of information.','品牌就一项明确的包装工作询问你的服务费时，计为询盘。供应商发来的价目表作为采购信息记录。')
 },
 appointments:{
  channels:[
   channel('studio-peer-group',0,copy('Meet owners comparing booking patterns','结识分析预约情况的店主'),
    copy('Independent salon and studio owners discussing slow or oversubscribed slots.','正在交流冷门时段或预约过满问题的独立沙龙和工作室负责人。'),
    copy('Ask which booking decision they face next and whether they have period totals. Offer to examine one timetable or reporting period with the owner.','询问对方近期要做什么预约决策，有没有相应的汇总记录。可与负责人约定只分析一份排班表或一个统计周期。')),
   channel('front-desk-walkthrough',1,copy('Ask for a front-desk walkthrough','了解前台如何介绍服务'),
    copy('The manager who trains staff to explain a studio’s services.','负责培训前台介绍服务的工作室经理。'),
    copy('Ask how staff answer a first-time customer who cannot choose a service. Use the actual question to discuss a sales aid and who will approve it.','询问经理，当首次到店的顾客选不出服务时，员工通常怎样回答。根据这个真实问题讨论需要的销售资料及其审核人。')),
   channel('suite-introduction',2,copy('Connect through a shared studio space','通过共享工作室获得引荐'),
    copy('A shared-suite manager introducing a newly opened appointment business.','可引荐新开业预约制商家的共享工作室负责人。'),
    copy('Ask the new operator what customers need to know between booking and arrival. Scope the handout or message they could put into use for the next appointment.','询问新店主顾客从预约到抵达需要知道什么，讨论为下一次预约即可使用的说明材料或通知定下范围。'))
  ],
  measurement:copy('Log a studio inquiry when a manager names a booking or first-visit problem and asks for project terms. Use aggregate booking totals when discussing fit.','经理说明具体的预约或首次到访问题，并询问项目条件时，记为一条工作室询盘。讨论是否适合承接时使用预约汇总数。')
 },
 'home-services':{
  channels:[
   channel('trade-counter',0,copy('Meet crews at a supplier event','在供应商活动中结识服务团队'),
    copy('A local contractor at a trade counter demonstration or supplier open house.','参加建材供应商演示或开放日的本地承包商。'),
    copy('Ask what homeowners need to see before they request a quote. Discuss one completed job or a common service choice the crew can explain with approved material.','问承包商住户询价前想看到什么。围绕一个已完工项目或一项常见服务选择，讨论团队可用哪些已授权资料来说明。')),
   channel('cross-trade',1,copy('Ask a neighboring trade for a referral','请相关工种的商家引荐'),
    copy('A landscaper, cleaner or repair firm that refers seasonal jobs to another local crew.','会将季节性工作转介给其他本地团队的园艺、保洁或维修商家。'),
    copy('Ask to meet the crew opening its next booking window. Confirm the service area, available dates and booking contact before proposing a reminder.','请其引荐即将开放下一轮预约的团队。先确认服务区域、可约日期和预约联系人，再提议制作提醒材料。')),
   channel('season-review',2,copy('Follow up after the busy season','在旺季结束后回访'),
    copy('An operator you have worked with, or a dispatcher who can introduce the owner.','曾与你合作的经营者，或能引荐店主的调度负责人。'),
    copy('Ask which services filled their schedule last season and what they want to release next. Offer to use their records to answer that one planning question.','询问上季哪些服务排满了工单，以及下一轮计划开放什么服务。可提议用已有记录回答这一个排期问题。'))
  ],
  measurement:copy('Record the crew as the prospect when it asks for help with its own marketing or planning. Homeowners asking the crew for service belong to the crew’s pipeline.','团队为自己的营销或排期寻求帮助时，将该团队记为你的潜在客户。住户向团队预约上门服务，属于该团队自己的业务线索。')
 }
};
function clientReach(id){return Object.hasOwn(CLIENT_REACH,id)?CLIENT_REACH[id]:null;}
function recommendation(id){return Object.hasOwn(recommendations,id)?recommendations[id]:null;}
if(root.QQChinese)Object.assign(root.QQChinese,chineseCopy);

function createService(id){const service=SERVICES.find(value=>value.id===id);if(!service)throw Error(`Unknown catalog service: ${id}`);return clone(service);}
function starterServices(bundleId='restaurant-starter'){const bundle=BUNDLES.find(value=>value.id===bundleId);if(!bundle)throw Error(`Unknown service bundle: ${bundleId}`);return bundle.items.map(item=>({...createService(item.id),weight:item.weight}));}
function auditService(service){const source=SERVICES.find(value=>value.id===service?.spec?.packageId),compatible=Boolean(source&&source.spec.catalogId===service?.spec?.catalogId&&source.spec.version===service?.spec?.version);if(!compatible)return{compatible:false,edited:[],records:[],derivation:'Custom, legacy, or unknown-catalog service; no catalog evidence was substituted.'};const fields=['name','deliverable','filesOnlyScope','price','hours','review','print','recurring','audience','goal','category','spec','fulfillment','campaign'],edited=fields.filter(key=>(key!=='filesOnlyScope'||service.filesOnlyScope!==undefined)&&JSON.stringify(service[key])!==JSON.stringify(source[key]));return{compatible:true,edited,records:source.spec.evidenceIds.map(id=>clone(SOURCES.find(value=>value.id===id))).filter(Boolean),derivation:DERIVATIONS[source.id].explanation,modelRecord:clone(DERIVATIONS[source.id]),catalogService:clone(source)};}
const deepFreeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const item of Object.values(value))deepFreeze(item);}return value;};
for(const value of [CATALOG,OPPORTUNITY_CATALOG,SOURCES,PRINT_OBSERVATIONS,DERIVATIONS,BUNDLE_DERIVATIONS,BUNDLES,SERVICES,recommendations,CLIENT_REACH])deepFreeze(value);
const api=deepFreeze({CATALOG,OPPORTUNITY_CATALOG,CLIENT_MENUS,FEATURED_IDS,recommendation,clientReach,SOURCES,PRINT_OBSERVATIONS,DERIVATIONS,BUNDLE_DERIVATIONS,BUNDLES,SERVICES,starterServices,createService,auditService});root.QQServiceCatalog=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
