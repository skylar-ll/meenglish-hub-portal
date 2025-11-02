import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, CreditCard, AlertCircle } from "lucide-react";
import { useFormConfigurations } from "@/hooks/useFormConfigurations";

interface PayRemainingBalanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billingId: string;
  studentId: string;
  remainingAmount: number;
  onPaymentSuccess: () => void;
}

export const PayRemainingBalanceModal = ({
  open,
  onOpenChange,
  billingId,
  studentId,
  remainingAmount,
  onPaymentSuccess,
}: PayRemainingBalanceModalProps) => {
  const [paymentAmount, setPaymentAmount] = useState<number>(remainingAmount);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { paymentMethods } = useFormConfigurations();

  const handlePayment = async () => {
    if (paymentAmount <= 0) {
      toast.error("Payment amount must be greater than 0");
      return;
    }

    if (paymentAmount > remainingAmount) {
      toast.error("Payment amount cannot exceed remaining balance");
      return;
    }

    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    try {
      setLoading(true);

      // Get current billing data
      const { data: billingData, error: fetchError } = await supabase
        .from("billing")
        .select("amount_paid, amount_remaining")
        .eq("id", billingId)
        .single();

      if (fetchError) throw fetchError;

      const newAmountPaid = (billingData.amount_paid || 0) + paymentAmount;
      const newAmountRemaining = billingData.amount_remaining - paymentAmount;

      // Update billing record
      const { error: updateError } = await supabase
        .from("billing")
        .update({
          amount_paid: newAmountPaid,
          amount_remaining: newAmountRemaining,
          last_payment_date: new Date().toISOString().split('T')[0],
        })
        .eq("id", billingId);

      if (updateError) throw updateError;

      // Record payment in history
      const { error: historyError } = await supabase
        .from("payment_history")
        .insert({
          billing_id: billingId,
          student_id: studentId,
          amount_paid: paymentAmount,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod,
        });

      if (historyError) throw historyError;

      toast.success(
        newAmountRemaining <= 0
          ? "Payment completed! Full amount paid."
          : "Payment recorded successfully!"
      );

      onPaymentSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(`Payment failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pay Remaining Balance
          </DialogTitle>
          <DialogDescription>
            Complete your payment to continue with full access to your courses
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Remaining Balance Display */}
          <Alert>
            <DollarSign className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold">Current Balance Due</p>
                <p className="text-2xl font-bold text-primary">
                  {remainingAmount.toFixed(2)} SAR
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Payment Amount (SAR) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="payment-amount"
                type="number"
                min="0.01"
                max={remainingAmount}
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="pl-10"
                placeholder="Enter amount"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaymentAmount(remainingAmount / 2)}
              >
                Pay Half
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaymentAmount(remainingAmount)}
              >
                Pay Full
              </Button>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="payment-method">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Remaining After Payment */}
          {paymentAmount > 0 && paymentAmount < remainingAmount && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                After this payment, you will still owe:{" "}
                <span className="font-semibold">
                  {(remainingAmount - paymentAmount).toFixed(2)} SAR
                </span>
              </AlertDescription>
            </Alert>
          )}

          {paymentAmount >= remainingAmount && paymentAmount > 0 && (
            <Alert className="border-green-600 bg-green-50 dark:bg-green-950">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                This payment will complete your balance! ✓
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={loading || paymentAmount <= 0 || !paymentMethod}
              className="flex-1 bg-gradient-to-r from-primary to-secondary"
            >
              {loading ? "Processing..." : `Pay ${paymentAmount.toFixed(2)} SAR`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
