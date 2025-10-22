import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { ArrowLeft, DollarSign, Plus, Edit, Trash2 } from 'lucide-react';
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

interface CoursePricing {
  id: string;
  duration_months: number;
  price: number;
}

const CoursePricingManagement = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<CoursePricing[]>([]);
  const [editingPricing, setEditingPricing] = useState<CoursePricing | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [editForm, setEditForm] = useState({
    duration_months: 1,
    price: 0,
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
        .single();

      if (roleData?.role !== 'admin') {
        navigate('/');
        return;
      }

      await fetchPricing();
    } catch (error) {
      toast.error('Access denied');
      navigate('/');
    }
  };

  const fetchPricing = async () => {
    try {
      const { data, error } = await supabase
        .from('course_pricing')
        .select('*')
        .order('duration_months', { ascending: true });

      if (error) throw error;
      setPricing(data || []);
    } catch (error: any) {
      toast.error('Failed to load course pricing');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (pricingItem: CoursePricing) => {
    setEditingPricing(pricingItem);
    setIsAddMode(false);
    setEditForm({
      duration_months: pricingItem.duration_months,
      price: pricingItem.price,
    });
  };

  const handleAddClick = () => {
    setIsAddMode(true);
    setEditingPricing(null);
    setEditForm({
      duration_months: 1,
      price: 0,
    });
  };

  const handleSave = async () => {
    try {
      if (isAddMode) {
        const { error } = await supabase
          .from('course_pricing')
          .insert([editForm]);
        
        if (error) throw error;
        toast.success('Pricing added successfully');
      } else if (editingPricing) {
        const { error } = await supabase
          .from('course_pricing')
          .update(editForm)
          .eq('id', editingPricing.id);

        if (error) throw error;
        toast.success('Pricing updated successfully');
      }

      setEditingPricing(null);
      setIsAddMode(false);
      fetchPricing();
    } catch (error: any) {
      toast.error('Failed to save pricing');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing?')) return;

    try {
      const { error } = await supabase
        .from('course_pricing')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Pricing deleted successfully');
      fetchPricing();
    } catch (error: any) {
      toast.error('Failed to delete pricing');
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
      <div className="container max-w-5xl mx-auto py-8">
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
            Course Pricing Management
          </h1>
          <Button
            onClick={handleAddClick}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Pricing
          </Button>
        </div>

        <Card className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Duration (Months)</TableHead>
                  <TableHead>Price (SAR)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricing.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold">
                      {item.duration_months} {item.duration_months === 1 ? 'Month' : 'Months'}
                    </TableCell>
                    <TableCell className="text-lg font-bold text-primary">
                      {item.price.toLocaleString()} SAR
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditClick(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(item.id)}
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

        {/* Edit/Add Dialog */}
        <Dialog open={!!editingPricing || isAddMode} onOpenChange={() => {
          setEditingPricing(null);
          setIsAddMode(false);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isAddMode ? 'Add' : 'Edit'} Course Pricing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Duration (Months)</Label>
                <Input
                  type="number"
                  min="1"
                  value={editForm.duration_months}
                  onChange={(e) => setEditForm({ ...editForm, duration_months: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Price (SAR)</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setEditingPricing(null);
                setIsAddMode(false);
              }}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-primary to-secondary">
                <DollarSign className="w-4 h-4 mr-2" />
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CoursePricingManagement;
