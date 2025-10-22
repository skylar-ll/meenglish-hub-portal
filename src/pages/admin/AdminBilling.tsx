import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Download, Edit, Trash2, DollarSign } from 'lucide-react';
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

  const fetchBillings = async () => {
    try {
      const { data, error } = await supabase
        .from('billing')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBillings(data || []);
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
      window.open(data.signedUrl, '_blank');
    } catch (e) {
      toast.error('Unable to open PDF');
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {billings.map((billing) => (
            <Card key={billing.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6 space-y-4">
                {/* Header with Student Info */}
                <div className="border-b pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{billing.student_name_en}</h3>
                      <p className="text-sm text-muted-foreground">{billing.student_name_ar}</p>
                    </div>
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">ID: {billing.student_id || 'N/A'}</p>
                </div>

                {/* Course Details */}
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Course Package</p>
                    <p className="font-semibold text-sm">{billing.course_package}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Time Slot</p>
                      <p className="font-medium text-sm">{billing.time_slot || 'TBD'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Levels</p>
                      <p className="font-medium text-sm">{billing.level_count}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Registration</p>
                      <p className="font-medium text-sm">{new Date(billing.registration_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Start Date</p>
                      <p className="font-medium text-sm">{new Date(billing.course_start_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Financial Info */}
                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Total Fee</span>
                    <span className="font-bold">${billing.total_fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Discount ({billing.discount_percentage}%)</span>
                    <span className="text-sm text-green-600">-${(billing.total_fee * billing.discount_percentage / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Amount Paid</span>
                    <span className="font-semibold text-green-600">${billing.amount_paid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Remaining</span>
                    <span className="font-semibold text-destructive">${billing.amount_remaining.toFixed(2)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    variant="default"
                    onClick={() => handleDownloadPDF(billing)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    View PDF
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleEditClick(billing)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(billing.id)}
                  >
                    <Trash2 className="w-4 h-4" />
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
                  ${(editForm.total_fee * (1 - editForm.discount_percentage / 100)).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground mt-2 mb-1">Amount Remaining:</p>
                <p className="text-xl font-bold text-destructive">
                  ${((editForm.total_fee * (1 - editForm.discount_percentage / 100)) - editForm.amount_paid).toFixed(2)}
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
      </div>
    </div>
  );
};

export default AdminBilling;
