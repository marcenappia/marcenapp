import { supabase } from '@/integrations/supabase/client';

export type AsaasEnvironment = 'sandbox' | 'production';
export type AsaasBillingType = 'UNDEFINED' | 'BOLETO' | 'CREDIT_CARD' | 'PIX';
export type AsaasCycle = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMESTERLY' | 'YEARLY';
export type MarcenappPlan = 'start' | 'pro' | 'business';
export type StoreProductKey = 'image_single' | 'image_pack_5' | 'contract_single' | 'contract_pack_5' | 'cut_plan_single' | 'marcena_essencial' | 'marcena_profissional';

export type AsaasConnectionStatus = { configured: boolean; connected: boolean; environment: AsaasEnvironment; customerCount?: number };
export type AsaasCustomer = { id: string; name: string; cpfCnpj?: string; email?: string; mobilePhone?: string; externalReference?: string };
export type AsaasPayment = { id: string; customer: string; billingType: AsaasBillingType; value: number; status: string; dueDate?: string; invoiceUrl?: string; bankSlipUrl?: string; externalReference?: string };
export type AsaasSubscription = { id: string; customer: string; billingType: AsaasBillingType; value: number; cycle: AsaasCycle; status: string; nextDueDate?: string; externalReference?: string };
export type AsaasPixQrCode = { encodedImage: string; payload: string; expirationDate: string };

async function callAsaas<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('asaas', { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export function getAsaasConnectionStatus() { return callAsaas<AsaasConnectionStatus>({ action: 'connection_status' }); }
export function listAsaasCustomers(filters: { limit?: number; offset?: number; externalReference?: string; cpfCnpj?: string; email?: string } = {}) { return callAsaas<{ data: AsaasCustomer[]; totalCount: number }>({ action: 'list_customers', ...filters }); }
export function createAsaasCustomer(input: { name: string; cpfCnpj?: string; email?: string; mobilePhone?: string; externalReference?: string }) { return callAsaas<{ customer: AsaasCustomer; reused: boolean }>({ action: 'create_customer', ...input }); }
export function createAsaasPayment(input: { customerId: string; value: number; billingType: AsaasBillingType; dueDate?: string; description?: string; externalReference?: string; installmentCount?: number; totalValue?: number }) { return callAsaas<{ payment: AsaasPayment }>({ action: 'create_payment', ...input }); }
export function createAsaasProductPayment(input: { customerId: string; productKey: StoreProductKey; billingType?: AsaasBillingType; dueDate?: string }) { return callAsaas<{ payment: AsaasPayment; product: { name: string; credits: number; amount: number; creditType: string } }>({ action: 'create_product_payment', ...input }); }
export function getAsaasWallet() { return callAsaas<{ wallet: { image_credits: number; contract_credits: number; cut_plan_credits: number; marcena_credits: number } }>({ action: 'get_wallet' }); }
export function getAsaasPixQrCode(paymentId: string) { return callAsaas<{ pix: AsaasPixQrCode }>({ action: 'get_pix_qr', paymentId }); }
export function getAsaasPayment(paymentId: string) { return callAsaas<{ payment: AsaasPayment }>({ action: 'get_payment', paymentId }); }
export function createAsaasSubscription(input: { customerId: string; value: number; billingType: AsaasBillingType; cycle: AsaasCycle; nextDueDate?: string; description?: string; externalReference?: string; plan?: MarcenappPlan }) { return callAsaas<{ subscription: AsaasSubscription }>({ action: 'create_subscription', ...input }); }
