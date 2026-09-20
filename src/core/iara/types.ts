export type CorrelationId = string;
export interface ExecutionContext { userId:string; projectId?:string; environmentId?:string; versionId?:string; correlationId:CorrelationId; generation?:number; decorStyle?:string; lastImageBase?:string; lastImageMask?:string; referenceImages?:Array<{mimeType:string;data:string;kind?:string}>; }
export type Result<T> = {ok:true;data:T}|{ok:false;error:string;code?:string};
export const ok=<T>(data:T):Result<T>=>({ok:true,data});
export const fail=<T=never>(error:string,code?:string):Result<T>=>({ok:false,error,code});
