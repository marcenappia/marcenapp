import type {CorrelationId} from "../types";
export type IntentName="create_cliente"|"create_projeto"|"gerar_render"|"calcular_orcamento"|"gerar_contrato"|"operational_intelligence"|"smart_action"|"analyze_environment"|"analyze_plan"|"unknown";
export interface SlotRequirement{tool:string;field:string;label:string}
export interface PendingSlot{tool:string;args:Record<string,unknown>;missing:SlotRequirement[]}
export interface ConversationMessage{sender:"user"|"iara";text:string;metadata?:{pendingInput?:unknown}}
export interface ConversationContext{projectId?:string;environmentId?:string;decorStyle?:string;pendingSlot?:PendingSlot|null;recentMessages:ConversationMessage[]}
export interface IntentResolverInput{text:string;images?:{mimeType:string;data:string}[];context:ConversationContext;correlationId:CorrelationId}
export interface ResolvedIntent{intent:IntentName;entities:Record<string,unknown>;confidence:number;missingSlots:SlotRequirement[];source:"deterministic"|"llm";summary?:string}
export interface IntentResolver{name:string;resolve(input:IntentResolverInput):Promise<ResolvedIntent|null>}
