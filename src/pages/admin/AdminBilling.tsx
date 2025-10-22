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

        <Card className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Time Slot</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Levels</TableHead>
                  <TableHead>Total Fee</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billings.map((billing) => (
                  <TableRow key={billing.id}>
                    <TableCell className="font-mono text-sm">{billing.student_id || 'N/A'}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{billing.student_name_en}</p>
                        <p className="text-sm text-muted-foreground">{billing.student_name_ar}</p>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(billing.registration_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(billing.course_start_date).toLocaleDateString()}</TableCell>
                    <TableCell>{billing.time_slot || 'TBD'}</TableCell>
                    <TableCell>{billing.course_package}</TableCell>
                    <TableCell className="text-center">{billing.level_count}</TableCell>
                    <TableCell className="font-semibold">${billing.total_fee.toFixed(2)}</TableCell>
                    <TableCell className="text-success">${billing.amount_paid.toFixed(2)}</TableCell>
                    <TableCell className="text-destructive">${billing.amount_remaining.toFixed(2)}</TableCell>
                    <TableCell>{billing.discount_percentage}%</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPDF(billing)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditClick(billing)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(billing.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

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
