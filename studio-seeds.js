/* Optional Studio idea examples. Context to edit, not selected offers or prices. */
(function(root){
'use strict';

const clone=value=>JSON.parse(JSON.stringify(value));
function freeze(value){
  if(value&&typeof value==='object'){
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

const definitions=[
  {
    id:'business-data-question',
    name:'Answer one business question from existing data',
    family:'Analytics',
    summary:'Explore a bounded diagnostic before assuming a recurring reporting service.',
    buyer:'Possible buyer: a business owner with an unresolved sales or product question and access to relevant records.',
    problem:'The owner has reports but needs a checked explanation of a particular pattern and a practical next decision.',
    scope:'Explore one agreed question, source and reporting period. Start with data readiness and reconciliation; price additional cleanup or broader analysis separately.',
    deliverables:'A data-readiness summary and documented definitions.\nChecked findings, their limitations and a proposed next action.\nA reproducible working file or report in the agreed format.',
    inputs:'The business question, reporting period and currency.\nCustomer-authorized source exports and an explanation of their fields.\nCost coverage if the question concerns product margin rather than sales.\nAgreed access, sharing and handling requirements.',
    roles:['Analyst','Data preparation specialist','Independent reviewer'],
    handoffs:'Scope owner and client agree the question → analyst checks source readiness → preparation work resolves agreed issues → reviewer checks findings → scope owner discusses the next decision with the client.',
    acceptance:'Totals and exclusions can be traced to the supplied source.\nMissing costs or records remain explicit.\nThe client can distinguish an observed pattern from a causal claim or forecast.\nThe agreed question is answered, or the evidence gap is explained.',
    researchNotes:'Editable example hypothesis; buyer demand, delivery fit and economics are unconfirmed.\nWhich decision would a buyer pay to improve beyond the reports they already have?\nWhat tools and relevant analytical experience will this particular assignment need?\nHow much setup, cleanup, review and client discussion is required?\nWould a repeated decision justify a later recurring brief? Do not assume monthly demand.\nPublic documentation below establishes possible export workflows and limitations, not prices or willingness to pay.',
    sources:'Shopify report exports — workflow reference: https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/custom-reports/export-reports\nShopify profit reports — cost coverage limitation: https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/profit-reports\nFTC business information guide — collection, access and service-provider considerations: https://www.ftc.gov/business-guidance/resources/protecting-personal-information-guide-business',
    nextAction:'Write one buyer question and list the fields needed to answer it. Plan a delivery exercise using synthetic or appropriately authorized material; record all preparation, review and owner time.',
    unit:'per scoped diagnostic'
  },
  {
    id:'marketing-asset-refresh',
    name:'Refresh a defined set of marketing materials',
    family:'Design and production',
    summary:'Explore a reusable production service with clear input, revision and print boundaries.',
    buyer:'Possible buyer: a local business or small brand with existing marketing materials that need an agreed update.',
    problem:'The business needs accurate, consistent materials without an open-ended design project.',
    scope:'Define the asset set, formats and revisions. Check whether existing files support a refresh, require rebuilding the same appearance, or whether the buyer wants a new design. Include print coordination only when explicitly scoped.',
    deliverables:'The agreed updated layouts and export formats.\nA proof with a clear version reference.\nIf included, a specified print quantity and documented delivery responsibility.',
    inputs:'Existing assets and a source-file assessment.\nFinal text, prices, images and brand references supplied by the client.\nOutput sizes, quantities and print specifications where applicable.\nA named approver and agreed revision boundary.',
    roles:['Designer','Production reviewer','Print coordinator, if included'],
    handoffs:'Scope owner checks the brief and source files → designer produces a proof → reviewer checks content and output → client approves a specific version → any print order follows the approved version and specifications.',
    acceptance:'The requested edits and output specifications are complete.\nProof approval identifies the version being delivered or printed.\nRevision and delivery responsibilities match the agreed scope.\nDesigner, coordination and review effort have all been considered.',
    researchNotes:'Editable example hypothesis; this is not an active offering or a market-priced package.\nWhat set of materials does a reachable buyer need updated?\nWhich inputs must be final before work starts? A PDF is not automatically unsuitable for editing.\nHow much designer and owner effort does refresh, rebuild or custom work require?\nWhat does an exact supplier quote include, if printing is part of the work?\nWhat real trigger could lead to another purchase, without assuming a subscription?\nNo labor rate, print quote or public price comparison is attached to this example.',
    sources:'',
    nextAction:'Choose a representative asset set and describe the finished result. Record source readiness, revision limits and the effort/cost estimates still needed.',
    unit:'per agreed production batch'
  },
  {
    id:'product-catalog-content',
    name:'Prepare a consistent product catalog and sales content',
    family:'Product content',
    summary:'Explore structured product information and approved sales materials for a bounded batch.',
    buyer:'Possible buyer: a retailer, small brand or export supplier with inconsistent product information and an accessible review contact.',
    problem:'Product details, images or sales materials are incomplete or inconsistent, making them difficult to reuse accurately.',
    scope:'Agree a product batch, required fields, destination formats and review rules. Include writing, localization, image work or video only where those tasks and skills are explicitly agreed.',
    deliverables:'A structured product-information file with documented missing fields.\nThe agreed descriptions, image assets or sales sheets.\nA review log identifying approved specifications and claims.',
    inputs:'Product identifiers, specifications, variants and source documents.\nApproved image and language assets.\nDestination requirements and an agreed terminology list.\nA client contact who can verify technical details and claims.',
    roles:['Product data specialist','Content or localization specialist','Product reviewer'],
    handoffs:'Scope owner agrees the batch and required fields → specialist normalizes source information → content work uses verified details → client or qualified reviewer resolves factual questions → approved outputs are prepared for the agreed destination.',
    acceptance:'Products and variants remain correctly matched.\nMissing specifications are identified rather than invented.\nClaims and translations receive the agreed review.\nOutput meets the agreed destination format; publication requires a separate client decision.',
    researchNotes:'Editable example hypothesis; the buyer segment and delivery skills still need to fit a concrete assignment.\nWhich batch and destination create a useful, bounded first delivery?\nWho can verify supplier specifications and product claims?\nHow much variant, image, translation and review work is hidden in the batch?\nCould maintenance or later product launches create repeat work? Price each cycle explicitly.\nAdd the destination platform’s official product-format documentation when that destination is known; no platform requirement is assumed here.',
    sources:'',
    nextAction:'Define a small representative product batch and its destination. List the fields, verification owner and production tasks before estimating effort.',
    unit:'per specified product batch'
  },
  {
    id:'supplier-comparison-samples',
    name:'Compare suppliers and coordinate a sample',
    family:'Supplier coordination',
    summary:'Explore a paid coordination service separately from buying or holding inventory.',
    buyer:'Possible buyer: a business with a defined display, promotional or packaging need that matches the team’s supplier-category knowledge.',
    problem:'The buyer needs comparable sourcing options and evidence from a sample before deciding whether to place an order.',
    scope:'Agree the specification, comparison work and sample coordination. Separate the studio service fee from goods, samples, inspection, shipping and other third-party charges. Agree who purchases and pays before any order.',
    deliverables:'A written requirements brief and comparable supplier options.\nA documented list of included, excluded and unknown delivered costs.\nSample observations against agreed checks and a proposed next decision.',
    inputs:'Product specifications, quantity, destination and timing.\nRelevant supplier access and current written quotes.\nSample and inspection criteria.\nPurchasing, approval and payment responsibilities.',
    roles:['Sourcing coordinator','Category or quality reviewer','Logistics coordinator, if included'],
    handoffs:'Scope owner and buyer agree requirements → coordinator obtains comparable information → reviewer checks specifications and exclusions → an explicitly authorized sample is assessed → buyer decides whether to proceed.',
    acceptance:'Options use comparable specifications, quantities and delivery responsibilities.\nQuote dates, exclusions and unanswered questions are visible.\nSample observations are distinguished from unverified supplier claims.\nCoordination work does not silently make the studio the inventory owner or purchaser.',
    researchNotes:'Editable example hypothesis; supplier relationships do not establish fit for every product category.\nWhich actual category and buyer can the team serve competently?\nWill the buyer pay for comparison and coordination independently of the goods?\nWhat sample, inspection, replacement and communication effort is needed?\nWhich shipment-specific costs and responsibilities remain unknown?\nWould later orders create paid coordination work, and on what terms?\nThe references describe process and cost considerations, not a guarantee of supplier quality or delivered price.',
    sources:'U.S. Commerce landed-cost guidance — components to investigate for the actual shipment: https://www.trade.gov/determine-total-export-price\nAlibaba sourcing process — order detail, samples and inspection context: https://activity.alibaba.com/page/how_it_wroks.html',
    nextAction:'Choose one product category supported by actual team contacts. Draft a comparison brief and list the buyer decisions, quotes and sample checks still required.',
    unit:'per agreed sourcing brief'
  },
  {
    id:'china-market-discovery',
    name:'Explore one Chinese customer segment and channel',
    family:'Market discovery',
    summary:'A later option to investigate when a suitable buyer and category expertise are available.',
    buyer:'Possible buyer: an export-ready brand with a specific product, a defined Chinese audience to investigate and a realistic decision to make.',
    problem:'The brand needs a focused view of customer, competitor and channel fit before deciding what market test to pursue.',
    scope:'Investigate one agreed product category, segment and channel question. Localized sample material may support the discovery work. Execution, distribution and sales commitments require separate scope.',
    deliverables:'A dated evidence note describing the researched segment and channel options.\nLocalized sample content if agreed.\nA bounded market-test proposal with requirements, uncertainties and next decisions.',
    inputs:'Product details, brand assets and the buyer’s commercial objective.\nDemonstrated category, language and channel knowledge.\nResearch access and a defined evidence standard.\nA buyer contact able to decide what test is feasible.',
    roles:['Market researcher','Language or localization specialist','Category and channel reviewer'],
    handoffs:'Scope owner narrows the buyer question → researcher gathers dated evidence → language and category review checks interpretation → buyer reviews the options and decides whether to commission a separate test.',
    acceptance:'Claims link to dated evidence or are explicitly identified as hypotheses.\nRegional, category and channel boundaries remain clear.\nThe buyer can distinguish discovery findings from proof of demand or market access.\nRequirements for any later test are explicit.',
    researchNotes:'Editable example for later exploration, not a launch recommendation.\nIs there an accessible export-ready buyer with a concrete question?\nWhich category and channel expertise has the team actually demonstrated?\nWhat local research can be performed credibly within a bounded scope?\nWhat would make the proposed test worthwhile to the buyer?\nChinese-language ability and supplier contacts do not by themselves validate consumer or channel expertise.\nThe public references provide context; they do not establish demand for the studio’s service or guarantee sales.',
    sources:'U.S. Commerce China distribution channels — route and partner context: https://www.trade.gov/country-commercial-guides/china-distribution-and-sales-channels\nU.S. Commerce China market-entry strategy — focus and local-market context: https://www.trade.gov/country-commercial-guides/china-market-entry-strategy',
    nextAction:'Identify a potential buyer question and the specific category/channel expertise it needs. Keep the idea exploratory until those are credible.',
    unit:'per scoped discovery brief'
  }
];

const textFields=['name','family','buyer','problem','scope','deliverables','inputs','handoffs','acceptance','researchNotes','sources','nextAction','unit'];
const numberFields=['price','directCost','overhead','ownerHours','ownerRate','setupOwnerHours','setupCost','scenarioQuantity'];
const registry=new Map(definitions.map(definition=>{
  const draft=Object.fromEntries(textFields.map(field=>[field,definition[field]]));
  Object.assign(draft,Object.fromEntries(numberFields.map(field=>[field,''])));
  draft.status='idea';
  draft.origin={kind:'example',ref:definition.id,label:'Editable example · '+definition.name};
  draft.roles=definition.roles.map((name,index)=>({id:'role-'+(index+1),name,hours:'',setupHours:'',rate:''}));
  return [definition.id,freeze(draft)];
}));

const EXAMPLES=freeze(definitions.map(({id,name,family,summary})=>({id,name,family,summary})));
function create(id){
  const draft=registry.get(id);
  if(!draft)throw Error('Unknown Studio idea example.');
  return clone(draft);
}

const api=Object.freeze({EXAMPLES,create});
root.QQStudioSeeds=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
