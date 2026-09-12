export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableDefinition = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: unknown[];
};

type FunctionDefinition = {
  Args: Record<string, unknown>;
  Returns: unknown;
  SetofOptions?: unknown;
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
