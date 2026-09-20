import type {IntentResolver,IntentResolverInput,ResolvedIntent} from "./types";
export const MIN_CONFIDENCE_TO_ACT=.5;
export interface ResolverChainConfig{resolvers:IntentResolver[];minConfidence?:number}
export async function resolveIntent(input:IntentResolverInput,cfg:ResolverChainConfig):Promise<ResolvedIntent>{for(const r of cfg.resolvers){const x=await r.resolve(input);if(x&&x.confidence>=(cfg.minConfidence??MIN_CONFIDENCE_TO_ACT))return x;}return{intent:"unknown",entities:{},confidence:0,missingSlots:[],source:"deterministic",summary:"Não consegui identificar o que fazer com esse pedido. Pode reformular?"};}
export const defaultResolverChain=(deterministic:IntentResolver,llm:IntentResolver):ResolverChainConfig=>({resolvers:[deterministic,llm]});
