import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Download, Edit } from 'lucide-react';
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

  const handleGeneratePDF = async (billing: BillingRecord) => {
    try {
      if (!billing.signature_url) {
        toast.error('No signature available');
        return;
      }

      // Import and use the centralized PDF generator
      const { generateBillingPDF } = await import('@/components/billing/BillingPDFGenerator');
      
      const billingData = {
        student_id: billing.student_id,
        student_name_en: billing.student_name_en,
        student_name_ar: billing.student_name_ar,
        phone: billing.phone,
        course_package: billing.course_package,
        time_slot: billing.time_slot,
        registration_date: billing.registration_date,
        course_start_date: billing.course_start_date,
        level_count: billing.level_count,
        total_fee: billing.total_fee,
        discount_percentage: billing.discount_percentage,
        fee_after_discount: billing.fee_after_discount,
        amount_paid: billing.amount_paid,
        amount_remaining: billing.amount_remaining,
        first_payment: billing.fee_after_discount / 2,
        second_payment: billing.fee_after_discount / 2,
        signature_url: billing.signature_url,
        student_id_code: billing.student_id,
      };

      const pdfBlob = await generateBillingPDF(billingData);
      const today = new Date().toISOString().slice(0, 10);
      const fileName = `BillingForm_${billing.student_name_en.replace(/[^a-zA-Z0-9]/g, '_')}_${today}.pdf`;
      
      // Cross-platform download approach
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      // Check if we're on iOS/Safari which handles downloads differently
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      if (isIOS || isSafari) {
        // For iOS/Safari: Open in new tab (will trigger native PDF viewer with save option)
        const newWindow = window.open(blobUrl, '_blank');
        if (!newWindow) {
          // If popup blocked, try direct navigation
          window.location.href = blobUrl;
        }
      } else {
        // For other browsers: Use download link
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
        document.body.appendChild(link);
        
        // Use click() with a slight delay for better compatibility
        setTimeout(() => {
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          }, 250);
        }, 100);
      }
      
      toast.success('PDF generated - check your downloads or new tab');
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
                    onClick={() => handleGeneratePDF(billing)}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                  <Button
                    onClick={() => handleEditClick(billing)}
                    variant="outline"
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Billing
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
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminBilling;
