import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Download, Edit, Trash2, DollarSign, Printer } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import jsPDF from 'jspdf';

interface BillingRecord {
  id: string;
  student_id: string;
  student_name_en: string;
  student_name_ar: string;
  phone: string;
  course_package: string;
  registration_date: string;
  course_start_date: string;
  time_slot: string;
  level_count: number;
  total_fee: number;
  discount_percentage: number;
  fee_after_discount: number;
  amount_paid: number;
  amount_remaining: number;
  signed_pdf_url: string | null;
  signature_url: string | null;
  language: string;
}

const AdminBilling = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [billings, setBillings] = useState<BillingRecord[]>([]);
  const [editingBilling, setEditingBilling] = useState<BillingRecord | null>(null);
  const [editForm, setEditForm] = useState({
    total_fee: 0,
    discount_percentage: 0,
    amount_paid: 0,
  });
  const [signatureUrls, setSignatureUrls] = useState<Record<string, string>>({});
  const [payingBilling, setPayingBilling] = useState<BillingRecord | null>(null);
  const [payPercent, setPayPercent] = useState<number>(50);
  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/admin/login');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        navigate('/admin/login');
        return;
      }

      await fetchBillings();
    } catch (error) {
      toast.error('Access denied');
      navigate('/');
    }
  };

  const prepareSignatureUrls = async (records: BillingRecord[]) => {
    try {
      const entries = await Promise.all(
        records
          .filter((r) => !!r.signature_url)
          .map(async (r) => {
            const raw = r.signature_url as string;
            const marker = '/signatures/';
            let path = raw;
            const idx = raw.indexOf(marker);
            // If it's a full HTTP URL to the private bucket, extract the path after /signatures/
            if (raw.startsWith('http') && idx !== -1) {
              path = raw.substring(idx + marker.length);
            }
            // Remove any leading slashes
            path = path.replace(/^\/+/, '');

            const { data, error } = await supabase.storage
              .from('signatures')
              .createSignedUrl(path, 60 * 60);
            const url = !error && data?.signedUrl ? data.signedUrl : raw;
            return [r.id, url] as const;
          })
      );
      setSignatureUrls(Object.fromEntries(entries));
    } catch (e) {
      // ignore errors and fall back to raw URLs
    }
  };

  const fetchBillings = async () => {
    try {
      const { data, error } = await supabase
        .from('billing')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = data || [];
      setBillings(rows);
      await prepareSignatureUrls(rows);
    } catch (error: any) {
      toast.error('Failed to load billing records');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (billing: BillingRecord) => {
    setEditingBilling(billing);
    setEditForm({
      total_fee: billing.total_fee,
      discount_percentage: billing.discount_percentage,
      amount_paid: billing.amount_paid,
    });
  };

  const handleEditSave = async () => {
    if (!editingBilling) return;

    try {
      const { error } = await supabase
        .from('billing')
        .update(editForm)
        .eq('id', editingBilling.id);

      if (error) throw error;

      toast.success('Billing updated successfully');
      setEditingBilling(null);
      fetchBillings();
    } catch (error: any) {
      toast.error('Failed to update billing');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this billing record?')) return;

    try {
      const { error } = await supabase
        .from('billing')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Billing deleted successfully');
      fetchBillings();
    } catch (error: any) {
      toast.error('Failed to delete billing');
    }
  };
  
  const handleOpenPay = (billing: BillingRecord) => {
    setPayingBilling(billing);
    setPayPercent(50);
  };

  const handleConfirmPay = async () => {
    if (!payingBilling) return;
    try {
      const pct = Math.max(0, Math.min(100, Number(payPercent) || 0));
      const intended = Math.round(payingBilling.fee_after_discount * (pct / 100));
      const amountToPay = Math.min(intended, payingBilling.amount_remaining);

      const newPaid = payingBilling.amount_paid + amountToPay;
      const newRemaining = Math.max(0, payingBilling.fee_after_discount - newPaid);

      const { error } = await supabase
        .from('billing')
        .update({ amount_paid: newPaid, amount_remaining: newRemaining })
        .eq('id', payingBilling.id);

      if (error) throw error;
      toast.success(`Recorded payment of ${amountToPay.toLocaleString()} SR`);
      setPayingBilling(null);
      await fetchBillings();
    } catch (e) {
      toast.error('Failed to record payment');
    }
  };
  const handleDownloadPDF = async (billing: BillingRecord) => {
    try {
      if (!billing.signed_pdf_url) {
        toast.info('PDF not available yet');
        return;
      }
      // Treat signed_pdf_url as storage path and create a signed URL (bucket is private)
      const { data, error } = await supabase.storage
        .from('billing-pdfs')
        .createSignedUrl(billing.signed_pdf_url, 60 * 60); // 1 hour
      if (error || !data?.signedUrl) throw error || new Error('No signed URL');
      
      // Download the file
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = `billing_${billing.student_name_en}_${billing.student_id}.pdf`;
      link.click();
    } catch (e) {
      toast.error('Unable to download PDF');
    }
  };

  const handlePrint = (billingId: string) => {
    const element = document.getElementById(`billing-${billingId}`);
    if (!element) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Billing Form</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .signature-box { border: 2px dashed #ccc; padding: 20px; margin: 20px 0; }
            .signature-box img { max-width: 100%; height: auto; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const imageToDataURL = async (url: string): Promise<string> => {
    // If it's already a data URL, return as-is
    if (url.startsWith('data:')) return url;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch image');
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };
  const handleGeneratePDF = async (billing: BillingRecord) => {
    try {
      if (!billing.signature_url) {
        toast.error('No signature to embed');
        return;
      }

      // Resolve a usable URL for the signature image
      const resolveSignatureUrl = async (): Promise<string> => {
        const raw = billing.signature_url as string;
        if (raw.startsWith('data:')) return raw; // direct data URL
        if (raw.startsWith('http')) return raw;  // already a full URL
        // Otherwise, it's a storage path in the private "signatures" bucket
        const cleaned = raw.replace(/^\/+/, '');
        const { data, error } = await supabase.storage
          .from('signatures')
          .createSignedUrl(cleaned, 60 * 10);
        if (error || !data?.signedUrl) {
          console.warn('Signature sign error', error);
          throw new Error('Signature image not found');
        }
        return data.signedUrl;
      };

      const signedSigUrl = await resolveSignatureUrl();

      // Build the PDF
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      doc.setFontSize(16);
      doc.text('Modern Education Institute of Language', 40, 40);
      doc.setFontSize(12);
      doc.text(`Student Name (English): ${billing.student_name_en}`, 40, 70);
      doc.text(`Student Name (Arabic): ${billing.student_name_ar}`, 40, 90);
      doc.text(`Contact Number: ${billing.phone}`, 40, 110);
      doc.text(`Course Package: ${billing.course_package}`, 40, 130);
      doc.text(`Time Slot: ${billing.time_slot || 'TBD'}`, 40, 150);
      doc.text(`Level Count: ${billing.level_count}`, 40, 170);
      doc.text(`Registration Date: ${new Date(billing.registration_date).toLocaleDateString()}`, 40, 190);
      doc.text(`Course Start Date: ${new Date(billing.course_start_date).toLocaleDateString()}`, 40, 210);
      doc.text(`Total Fee: ${billing.total_fee} SR  |  Discount: ${billing.discount_percentage}%`, 40, 230);
      doc.text(`Fee After Discount: ${billing.fee_after_discount} SR`, 40, 250);
      doc.text(`Amount Paid: ${billing.amount_paid} SR  |  Amount Remaining: ${billing.amount_remaining} SR`, 40, 270);

      try {
        const sigDataUrl = await imageToDataURL(signedSigUrl);
        doc.text('Student Signature:', 40, 310);
        doc.addImage(sigDataUrl, 'PNG', 40, 320, 300, 100);
      } catch (e) {
        console.warn('Failed to embed signature image into PDF', e);
      }

      const pdfBlob = doc.output('blob');
      const pdfPath = `${billing.student_id}/billing_${billing.id}.pdf`;
      const { error: upErr } = await supabase.storage
        .from('billing-pdfs')
        .upload(pdfPath, pdfBlob, { contentType: 'application/pdf', upsert: true });
      if (upErr) throw upErr;

      await supabase
        .from('billing')
        .update({ signed_pdf_url: pdfPath })
        .eq('id', billing.id);

      toast.success('PDF generated successfully');
      await fetchBillings();
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-7xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('student.back')}
        </Button>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Billing Management
          </h1>
          <div className="flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">{billings.length}</span>
            <span className="text-muted-foreground">Total Bills</span>
          </div>
        </div>

        <div className="grid gap-6">
          {billings.map((billing) => (
            <Card key={billing.id} className="overflow-hidden">
              <div id={`billing-${billing.id}`} className="p-8">
                {/* Form Header */}
                <div className="text-center border-b pb-4 mb-6">
                  <h2 className="text-2xl font-bold mb-2">Modern Education Institute of Language</h2>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Training License No.: 5300751</p>
                    <p>Commercial Registration No.: 2050122590</p>
                  </div>
                </div>

                {/* Student Info Grid */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Student Name (English)</p>
                    <p className="font-semibold text-lg">{billing.student_name_en}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Student Name (Arabic)</p>
                    <p className="font-semibold text-lg">{billing.student_name_ar}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Student ID</p>
                    <p className="font-mono font-semibold">{billing.student_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Contact Number</p>
                    <p className="font-semibold">{billing.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Course Package</p>
                    <p className="font-semibold">{billing.course_package}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Time Slot</p>
                    <p className="font-semibold">{billing.time_slot || 'TBD'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Registration Date</p>
                    <p className="font-semibold">{new Date(billing.registration_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Course Start Date</p>
                    <p className="font-semibold">{new Date(billing.course_start_date).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Financial Details */}
                <div className="bg-muted/30 rounded-lg p-6 mb-6">
                  <h3 className="font-bold text-lg mb-4">Financial Details</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Level Count</span>
                      <span className="font-bold">{billing.level_count}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Total Fee</span>
                      <span className="font-bold">{billing.total_fee.toLocaleString()} SR</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-bold text-green-600">{billing.discount_percentage}%</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Fee After Discount</span>
                      <span className="font-bold">{billing.fee_after_discount.toLocaleString()} SR</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Amount Paid</span>
                      <span className="font-bold text-green-600">{billing.amount_paid.toLocaleString()} SR</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Amount Remaining</span>
                      <span className="font-bold text-destructive">{billing.amount_remaining.toLocaleString()} SR</span>
                    </div>
                  </div>
                </div>

                {/* Student Signature */}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">Student Signature</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    ✍️ Please sign below to agree to the terms and conditions
                  </p>
                  <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 bg-background min-h-[200px] flex items-center justify-center">
                    {billing.signature_url ? (
                      <img 
                        src={signatureUrls[billing.id] || billing.signature_url} 
                        alt="Student Signature" 
                        className="w-full h-auto max-h-[400px] object-contain"
                        onError={(e) => {
                          console.error('Failed to load signature image');
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <p className="text-muted-foreground">No signature available</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t">
                  <Button
                    variant="default"
                    onClick={() => handleDownloadPDF(billing)}
                    disabled={!billing.signed_pdf_url}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleGeneratePDF(billing)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {billing.signed_pdf_url ? 'Re-generate PDF' : 'Generate PDF'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handlePrint(billing.id)}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print Bill
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => handleOpenPay(billing)}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Pay
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleEditClick(billing)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Billing
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(billing.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {billings.length === 0 && (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Billing Forms Yet</h3>
            <p className="text-muted-foreground">Billing forms will appear here when students complete registration.</p>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingBilling} onOpenChange={() => setEditingBilling(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Billing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Total Fee (SAR)</Label>
                <Input
                  type="number"
                  value={editForm.total_fee}
                  onChange={(e) => setEditForm({ ...editForm, total_fee: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Discount Percentage (%)</Label>
                <Input
                  type="number"
                  value={editForm.discount_percentage}
                  onChange={(e) => setEditForm({ ...editForm, discount_percentage: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Amount Paid (SAR)</Label>
                <Input
                  type="number"
                  value={editForm.amount_paid}
                  onChange={(e) => setEditForm({ ...editForm, amount_paid: parseFloat(e.target.value) })}
                />
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Fee After Discount:</p>
                <p className="text-2xl font-bold text-primary">
                  {(editForm.total_fee * (1 - editForm.discount_percentage / 100)).toLocaleString()} SR
                </p>
                <p className="text-sm text-muted-foreground mt-2 mb-1">Amount Remaining:</p>
                <p className="text-xl font-bold text-destructive">
                  {((editForm.total_fee * (1 - editForm.discount_percentage / 100)) - editForm.amount_paid).toLocaleString()} SR
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingBilling(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditSave} className="bg-gradient-to-r from-primary to-secondary">
                <DollarSign className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pay Dialog */}
        <Dialog open={!!payingBilling} onOpenChange={() => setPayingBilling(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record a Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Choose the percentage of the total fee to pay now.</p>
              <div className="flex flex-wrap gap-2">
                {[25,50,75,100].map((pct) => (
                  <Button
                    key={pct}
                    variant={payPercent === pct ? 'default' : 'outline'}
                    onClick={() => setPayPercent(pct)}
                  >
                    {pct}%
                  </Button>
                ))}
              </div>
              <div>
                <Label>Custom Percentage (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={payPercent}
                  onChange={(e) => setPayPercent(parseFloat(e.target.value || '0'))}
                />
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Amount to record:</p>
                <p className="text-2xl font-bold text-primary">
                  {payingBilling ? Math.min(Math.round(payingBilling.fee_after_discount * (payPercent/100)), payingBilling.amount_remaining).toLocaleString() : 0} SR
                </p>
                {payingBilling && (
                  <p className="text-sm text-muted-foreground mt-2">Remaining after payment: {Math.max(0, (payingBilling.fee_after_discount - (payingBilling.amount_paid + Math.min(Math.round(payingBilling.fee_after_discount * (payPercent/100)), payingBilling.amount_remaining)))).toLocaleString()} SR</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayingBilling(null)}>Cancel</Button>
              <Button onClick={handleConfirmPay} className="bg-gradient-to-r from-primary to-secondary">
                <DollarSign className="w-4 h-4 mr-2" />
                Confirm Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminBilling;
