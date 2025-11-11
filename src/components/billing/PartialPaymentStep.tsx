import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DollarSign, Calendar as CalendarIcon, AlertCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PartialPaymentStepProps {
  totalFee: number;
  feeAfterDiscount: number;
  discountPercentage: number;
  courseStartDate: string;
  paymentDeadline: string;
  onAmountChange: (amount: number) => void;
  onNextPaymentDateChange: (date: Date | undefined) => void;
  onPaymentDateChange?: (date: Date | undefined) => void;
  initialPayment?: number;
  initialNextPaymentDate?: Date;
}

export const PartialPaymentStep = ({
  totalFee,
  feeAfterDiscount,
  discountPercentage,
  courseStartDate,
  paymentDeadline,
  onAmountChange,
  onNextPaymentDateChange,
  onPaymentDateChange,
  initialPayment = 0,
  initialNextPaymentDate,
}: PartialPaymentStepProps) => {
  const [amountToPay, setAmountToPay] = useState<number>(initialPayment);
  const [nextPaymentDate, setNextPaymentDate] = useState<Date | undefined>(initialNextPaymentDate);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const remainingBalance = feeAfterDiscount - amountToPay;

  const handleNextPaymentDateChange = (date: Date | undefined) => {
    setNextPaymentDate(date);
    onNextPaymentDateChange(date);
  };

  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    const validAmount = Math.max(0, Math.min(numValue, feeAfterDiscount));
    setAmountToPay(validAmount);
    onAmountChange(validAmount);
  };

  const setPercentage = (percentage: number) => {
    const amount = feeAfterDiscount * (percentage / 100);
    setAmountToPay(amount);
    onAmountChange(amount);
  };

  return (
    <div className="space-y-6">
      {/* Total Fee Summary */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Original Price:</span>
            <span className="font-semibold">{totalFee.toFixed(2)} SAR</span>
          </div>
          {discountPercentage > 0 && (
            <>
              <div className="flex justify-between items-center text-green-600">
                <span>Discount ({discountPercentage}%):</span>
                <span className="font-semibold">-{(totalFee - feeAfterDiscount).toFixed(2)} SAR</span>
              </div>
              <div className="h-px bg-border" />
            </>
          )}
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total Amount Due:</span>
            <span className="text-primary">{feeAfterDiscount.toFixed(2)} SAR</span>
          </div>
        </div>
      </Card>

      {/* Payment Amount Input */}
      <div className="space-y-4">
        <Label htmlFor="payment-amount" className="text-base font-semibold">
          How much would you like to pay now?
        </Label>
        
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="payment-amount"
            type="number"
            min="0"
            max={feeAfterDiscount}
            step="0.01"
            value={amountToPay || ""}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="pl-10 text-lg font-semibold"
            placeholder="Enter amount"
          />
        </div>

        {/* Quick Payment Options */}
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setPercentage(25)}
            className="px-3 py-2 text-sm rounded-md border bg-background hover:bg-muted transition-colors"
          >
            25%
          </button>
          <button
            type="button"
            onClick={() => setPercentage(50)}
            className="px-3 py-2 text-sm rounded-md border bg-background hover:bg-muted transition-colors"
          >
            50%
          </button>
          <button
            type="button"
            onClick={() => setPercentage(75)}
            className="px-3 py-2 text-sm rounded-md border bg-background hover:bg-muted transition-colors"
          >
            75%
          </button>
          <button
            type="button"
            onClick={() => setPercentage(100)}
            className="px-3 py-2 text-sm rounded-md border bg-background hover:bg-muted transition-colors"
          >
            100%
          </button>
        </div>

        {/* Payment Date Selection */}
        <div className="space-y-2 pt-2">
          <Label className="text-sm font-medium">Payment Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !paymentDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {paymentDate ? format(paymentDate, "MMMM dd, yyyy") : <span>Select payment date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={paymentDate}
                onSelect={(date) => {
                  if (date) {
                    setPaymentDate(date);
                    onPaymentDateChange?.(date);
                  }
                }}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Payment Breakdown */}
      <Card className="p-6 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Paying Now:</span>
          <span className="font-semibold text-green-600">
            {amountToPay.toFixed(2)} SAR
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Remaining Balance:</span>
          <span className={`font-semibold ${remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {remainingBalance.toFixed(2)} SAR
          </span>
        </div>
      </Card>

      {/* Payment Deadline Info - Auto-generated */}
      {remainingBalance > 0 && (
        <Alert>
          <CalendarIcon className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold">Payment Deadline</p>
              <p className="text-sm">
                Remaining balance must be paid by{" "}
                <span className="font-semibold text-primary">
                  {format(new Date(paymentDeadline), "MMMM dd, yyyy")}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This deadline is automatically set to 1 month from registration date.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Warning */}
      {amountToPay === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please enter at least a partial payment amount to continue with registration.
          </AlertDescription>
        </Alert>
      )}

      {/* Full Payment Confirmation */}
      {remainingBalance === 0 && amountToPay > 0 && (
        <Alert className="border-green-600 bg-green-50 dark:bg-green-950">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            You're paying the full amount! No remaining balance.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
