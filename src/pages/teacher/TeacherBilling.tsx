import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Calendar, DollarSign } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface BillingSummary {
  student_id: string;
  student_name: string;
  course_start_date: string;
  time_slot: string;
  total_fee: number;
  amount_paid: number;
  amount_remaining: number;
  discount_percentage: number;
  payment_status: 'paid' | 'partial' | 'pending';
}

const TeacherBilling = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [billings, setBillings] = useState<BillingSummary[]>([]);

  useEffect(() => {
    checkTeacherAndFetch();
  }, []);

  const checkTeacherAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/teacher/login');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleData?.role !== 'teacher') {
        navigate('/');
        return;
      }

      await fetchBillings(user.id);
    } catch (error) {
      toast.error('Access denied');
      navigate('/');
    }
  };

  const fetchBillings = async (teacherId: string) => {
    try {
      // Get assigned students
      const { data: assignments, error: assignError } = await supabase
        .from('student_teachers')
        .select('student_id')
        .eq('teacher_id', teacherId);

      if (assignError) throw assignError;

      const studentIds = assignments?.map(a => a.student_id) || [];

      if (studentIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get billing info for assigned students
      const { data: billingData, error: billingError } = await supabase
        .from('billing')
        .select('*')
        .in('student_id', studentIds)
        .order('course_start_date', { ascending: false });

      if (billingError) throw billingError;

      const summaries: BillingSummary[] = (billingData || []).map(b => {
        let paymentStatus: 'paid' | 'partial' | 'pending' = 'pending';
        if (b.amount_remaining === 0) paymentStatus = 'paid';
        else if (b.amount_paid > 0) paymentStatus = 'partial';

        return {
          student_id: b.student_id,
          student_name: b.student_name_en,
          course_start_date: b.course_start_date,
          time_slot: b.time_slot || 'TBD',
          total_fee: b.total_fee,
          amount_paid: b.amount_paid,
          amount_remaining: b.amount_remaining,
          discount_percentage: b.discount_percentage,
          payment_status: paymentStatus,
        };
      });

      setBillings(summaries);
    } catch (error: any) {
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: 'paid' | 'partial' | 'pending') => {
    const variants = {
      paid: 'default',
      partial: 'secondary',
      pending: 'destructive',
    } as const;

    const labels = {
      paid: 'Fully Paid',
      partial: 'Partial Payment',
      pending: 'Pending',
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
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
      <div className="container max-w-6xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/teacher/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('student.back')}
        </Button>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Student Billing Summary
          </h1>
          <div className="flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">{billings.length}</span>
            <span className="text-muted-foreground">Students</span>
          </div>
        </div>

        {billings.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Students Assigned</h3>
            <p className="text-muted-foreground">You don't have any assigned students yet.</p>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Course Start Date</TableHead>
                    <TableHead>Time Slot</TableHead>
                    <TableHead>Total Fee</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billings.map((billing, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-semibold">{billing.student_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {new Date(billing.course_start_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>{billing.time_slot}</TableCell>
                      <TableCell className="font-semibold">${billing.total_fee.toFixed(2)}</TableCell>
                      <TableCell className="text-success">${billing.amount_paid.toFixed(2)}</TableCell>
                      <TableCell className="text-destructive font-semibold">
                        ${billing.amount_remaining.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {billing.discount_percentage > 0 && (
                          <Badge variant="outline" className="text-success border-success">
                            {billing.discount_percentage}% off
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(billing.payment_status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Total Revenue</h3>
                </div>
                <p className="text-2xl font-bold text-primary">
                  ${billings.reduce((sum, b) => sum + b.total_fee, 0).toFixed(2)}
                </p>
              </Card>
              <Card className="p-4 bg-success/5 border-success/20">
                <h3 className="font-semibold mb-2">Total Collected</h3>
                <p className="text-2xl font-bold text-success">
                  ${billings.reduce((sum, b) => sum + b.amount_paid, 0).toFixed(2)}
                </p>
              </Card>
              <Card className="p-4 bg-destructive/5 border-destructive/20">
                <h3 className="font-semibold mb-2">Total Remaining</h3>
                <p className="text-2xl font-bold text-destructive">
                  ${billings.reduce((sum, b) => sum + b.amount_remaining, 0).toFixed(2)}
                </p>
              </Card>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TeacherBilling;
