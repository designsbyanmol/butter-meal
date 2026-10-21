// components/Payments/RazorpayCheckout.tsx
import React, { useCallback } from 'react';
import { supabase } from '../../services/supabase.client';
import { config } from '../../config/env';
import { useRazorpayScript } from '../../hooks/useRazorpayScript';

export interface RazorpayInvokeResult {
  success: boolean;
  error?: string;
  paymentId?: string;
  orderId?: string;
}

export interface RazorpayCheckoutProps {
  /** Called with the amount, invoice id, and any action metadata. */
  onCheckoutSuccess: (result: {
    paymentId: string;
    orderId: string;
    invoiceId: string;
  }) => void | Promise<void>;
  onCheckoutFailure?: (reason: string) => void;

  /** Amount in rupees. */
  amount: number;
  /** The invoice id created beforehand. */
  invoiceId: string;
  /** Prefill helpers (optional). */
  prefillName?: string;
  prefillContact?: string;
  prefillEmail?: string;
  description?: string;

  /** The action the verify function should perform after signature validation. */
  action: 'signup' | 'extend' | 'change';
  tenantSlug?: string;
  planId?: string;
  months?: number;
  signupPayload?: Record<string, any>;

  /** Render prop / children used as the trigger button. */
  children: (args: { start: () => void; processing: boolean }) => React.ReactNode;
  disabled?: boolean;
}

export const RazorpayCheckout: React.FC<RazorpayCheckoutProps> = ({
  amount,
  invoiceId,
  prefillName,
  prefillContact,
  prefillEmail,
  description,
  action,
  tenantSlug,
  planId,
  months,
  signupPayload,
  children,
  onCheckoutSuccess,
  onCheckoutFailure,
  disabled,
}) => {
  const { ready, error: scriptError } = useRazorpayScript();
  const [processing, setProcessing] = React.useState(false);

  const start = useCallback(async () => {
    if (!ready) {
      onCheckoutFailure?.(scriptError ?? 'Razorpay not ready');
      return;
    }
    if (!supabase) {
      onCheckoutFailure?.('Supabase not configured');
      return;
    }

    setProcessing(true);

    try {
      // 1. Create the Razorpay order server-side
      const createOrder = await supabase.functions.invoke(
        'razorpay-create-order',
        {
          body: {
            amount,
            receipt: `inv_${invoiceId.slice(0, 8)}`,
            notes: { invoice_id: invoiceId, action },
          },
        },
      );

      if (createOrder.error) {
        throw new Error(createOrder.error.message ?? 'Order creation failed');
      }
      const data = createOrder.data as {
        order_id: string;
        amount: number;
        currency: string;
        key_id: string;
      };

      const keyId = data.key_id ?? config.razorpay.keyId;

      // 2. Open the Razorpay widget
      const rzp = new (window as any).Razorpay({
        key: keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Orcamus',
        description: description ?? 'Subscription payment',
        order_id: data.order_id,
        prefill: {
          name: prefillName ?? '',
          contact: prefillContact ?? '',
          email: prefillEmail ?? '',
        },
        theme: { color: '#1e7e34' },
        handler: async (response: any) => {
          try {
            // 3. Verify server-side
            const verify = await supabase.functions.invoke(
              'razorpay-verify',
              {
                body: {
                  invoice_id: invoiceId,
                  order_id: response.razorpay_order_id,
                  payment_id: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  action,
                  tenant_slug: tenantSlug,
                  plan_id: planId,
                  months,
                  signup_payload: signupPayload,
                },
              },
            );

            if (verify.error) {
              throw new Error(verify.error.message ?? 'Verification failed');
            }

            const vData = verify.data as { success: boolean; error?: string };
            if (!vData?.success) {
              throw new Error(vData?.error ?? 'Payment verification failed');
            }

            await onCheckoutSuccess({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              invoiceId,
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Verification failed';
            onCheckoutFailure?.(msg);
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            onCheckoutFailure?.('Payment cancelled');
          },
        },
      });

      rzp.on('payment.failed', (resp: any) => {
        setProcessing(false);
        onCheckoutFailure?.(
          resp?.error?.description ?? 'Payment failed',
        );
      });

      rzp.open();
    } catch (err) {
      setProcessing(false);
      const msg = err instanceof Error ? err.message : 'Payment failed';
      onCheckoutFailure?.(msg);
    }
  }, [
    ready,
    scriptError,
    amount,
    invoiceId,
    description,
    action,
    tenantSlug,
    planId,
    months,
    signupPayload,
    prefillName,
    prefillContact,
    prefillEmail,
    onCheckoutSuccess,
    onCheckoutFailure,
  ]);

  return <>{children({ start, processing: processing || disabled === true })}</>;
};

export default RazorpayCheckout;