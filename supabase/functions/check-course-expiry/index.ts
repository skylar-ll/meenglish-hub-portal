import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const today = new Date().toISOString().split('T')[0];
    
    // Find students with expired courses
    const { data: expiredStudents, error: fetchError } = await supabase
      .from('students')
      .select('id, full_name_en, email, expiration_date, subscription_status')
      .lt('expiration_date', today)
      .eq('subscription_status', 'active');
    
    if (fetchError) {
      throw new Error(`Failed to fetch expired students: ${fetchError.message}`);
    }
    
    const expiredCount = expiredStudents?.length || 0;
    console.log(`Found ${expiredCount} students with expired courses`);
    
    if (expiredStudents && expiredStudents.length > 0) {
      // Update subscription status to expired
      const expiredIds = expiredStudents.map(s => s.id);
      
      const { error: updateError } = await supabase
        .from('students')
        .update({ subscription_status: 'expired' })
        .in('id', expiredIds);
      
      if (updateError) {
        throw new Error(`Failed to update expired students: ${updateError.message}`);
      }
      
      console.log(`Updated ${expiredCount} students to expired status`);
    }
    
    // Find students expiring within 7 days (for early warning)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];
    
    const { data: expiringStudents, error: expiringError } = await supabase
      .from('students')
      .select('id, full_name_en, email, expiration_date')
      .gte('expiration_date', today)
      .lte('expiration_date', nextWeekStr)
      .eq('subscription_status', 'active');
    
    if (expiringError) {
      console.error('Failed to fetch expiring students:', expiringError);
    }
    
    const expiringCount = expiringStudents?.length || 0;
    console.log(`Found ${expiringCount} students expiring within 7 days`);
    
    // Also check for classes that have ended
    const { data: expiredClasses, error: classError } = await supabase
      .from('classes')
      .select('id, class_name, end_date, teacher_id, status')
      .lt('end_date', today)
      .eq('status', 'active');
    
    if (classError) {
      console.error('Failed to fetch expired classes:', classError);
    }
    
    const expiredClassCount = expiredClasses?.length || 0;
    console.log(`Found ${expiredClassCount} classes past end date`);
    
    // Update expired classes status
    if (expiredClasses && expiredClasses.length > 0) {
      const classIds = expiredClasses.map(c => c.id);
      
      const { error: classUpdateError } = await supabase
        .from('classes')
        .update({ status: 'completed' })
        .in('id', classIds);
      
      if (classUpdateError) {
        console.error('Failed to update class status:', classUpdateError);
      } else {
        console.log(`Updated ${expiredClassCount} classes to completed status`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_at: new Date().toISOString(),
        expired_students_updated: expiredCount,
        students_expiring_soon: expiringCount,
        classes_completed: expiredClassCount,
        expiring_students: expiringStudents?.map(s => ({
          name: s.full_name_en,
          email: s.email,
          expiration_date: s.expiration_date
        })) || []
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("Course expiry check error:", errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
