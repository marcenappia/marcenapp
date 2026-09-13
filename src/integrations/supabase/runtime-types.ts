/* eslint-disable @typescript-eslint/no-explicit-any */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableDefinition = {
  Row: Record<string, any>;
  Insert: Record<string, any>;
  Update: Record<string, any>;
  Relationships: any[];
};

type FunctionDefinition = {
  Args: Record<string, any> | any;
  Returns: any;
  SetofOptions?: any;
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.5' };
  public: {
    Tables: Record<string, TableDefinition>;
    Views: Record<string, TableDefinition>;
    Functions: Record<string, FunctionDefinition>;
    Enums: { app_role: 'admin' | 'owner' | 'editor' | 'viewer' };
    CompositeTypes: Record<string, never>;
  };
};
